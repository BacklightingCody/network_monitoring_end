import { Injectable, OnModuleInit } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '@/prisma/prisma.service';
import { promisify } from 'util';
import { Streamer } from 'stream-json';
import { chain } from 'stream-chain';
import { parser } from 'stream-json/Parser';
import { pick } from 'stream-json/filters/Pick';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { CaptureConfig } from '@/config/capture.config';

const execAsync = promisify(exec);

@Injectable()
export class CaptureService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CaptureConfig,
  ) {}

  async onModuleInit() {
    console.log('✅ 后端启动，自动抓包开始...');
    await this.startCapture(); // 默认启动抓包
  }

  async startCapture(params: Partial<{
    interface: string;
    duration: number;
    filter: string;
    fields: string[];
  }> = {}): Promise<string> {
    const tmpDir = path.dirname(this.config.jsonFilePath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const interfaceId = params.interface || this.config.defaultInterface;
    const duration = params.duration || this.config.defaultDuration;
    const filter = params.filter ? `-f "${params.filter}"` : '';
    const fields = (params.fields || this.config.defaultFields).map(f => `-e ${f}`).join(' ');

    const command = `${this.config.tsharkPath} -i ${interfaceId} ${filter} -a duration:${duration} -T json ${fields} > "${this.config.jsonFilePath}"`;

    try {
      const { stderr } = await execAsync(command, { shell: 'cmd.exe' });
      if (stderr && stderr.toLowerCase().includes('error')) {
        throw new Error(`tshark error: ${stderr}`);
      }
      console.log(`tshark output: ${stderr}`); // 记录统计信息
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.saveToDatabase();
      return `Capture completed: interface ${interfaceId}, duration ${duration}s`;
    } catch (err) {
      console.error('❌ 抓包失败：', err.message);
      throw err;
    }
  }

  async saveToDatabase(): Promise<void> {
    const pipeline = chain([
      fs.createReadStream(this.config.jsonFilePath),
      parser(),               // 解析 JSON
      pick({ filter: '.*' }), // 选择所有数组元素
      streamArray(),          // 流式处理数组
    ]);

    let packetsBatch: any[] = [];
    let totalSaved = 0;

    return new Promise((resolve, reject) => {
      pipeline
        .on('data', ({ value }) => {
          const layers = value._source?.layers || {};
          const frame = layers.frame || {};
          const eth = layers.eth || {};
          const ip = layers.ip || {};
          const tcp = layers.tcp || {};
          const udp = layers.udp || {};

          packetsBatch.push({
            timestamp: new Date(frame['frame.time'] || Date.now()),
            sourceMac: eth['eth.src'] ?? 'unknown',
            destinationMac: eth['eth.dst'] ?? 'unknown',
            sourceIp: ip['ip.src'] ?? 'unknown',
            destinationIp: ip['ip.dst'] ?? 'unknown',
            sourcePort: parseInt(tcp['tcp.srcport'] || udp['udp.srcport'] || '0', 10) || null,
            destinationPort: parseInt(tcp['tcp.dstport'] || udp['udp.dstport'] || '0', 10) || null,
            protocol: ip['ip.proto'] ?? frame['frame.protocols'] ?? 'unknown',
            length: parseInt(frame['frame.len'] || '0', 10),
            tcpFlags: tcp['tcp.flags'] ?? null,
          });

          if (packetsBatch.length >= this.config.batchSize) {
            this.processBatch(packetsBatch, totalSaved).catch(err => console.error('Batch error:', err));
            totalSaved += packetsBatch.length;
            packetsBatch = [];
          }
        })
        .on('end', async () => {
          if (packetsBatch.length > 0) {
            await this.processBatch(packetsBatch, totalSaved);
            totalSaved += packetsBatch.length;
          }
          console.log(`Total packets saved: ${totalSaved}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Stream error:', err.message);
          reject(err);
        });
    });
  }

  private async processBatch(batch: any[], totalSaved: number): Promise<void> {
    try {
      await this.prisma.packet.createMany({ data: batch });
      console.log(`Saved ${totalSaved + batch.length} packets`);
    } catch (err) {
      console.error('Batch save error:', err.message);
    }
  }

  async getLatestCapturedPackets(limit: number = 100) {
    return this.prisma.packet.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getAvailableInterfaces(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`${this.config.tsharkPath} -D`, { shell: 'cmd.exe' });
      return stdout.split('\n').map(line => line.trim()).filter(line => line);
    } catch (err) {
      console.error('Failed to get interfaces:', err.message);
      throw err;
    }
  }
}