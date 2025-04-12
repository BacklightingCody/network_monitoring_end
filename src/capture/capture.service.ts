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
import { ConfigService } from '@nestjs/config';

const execAsync = promisify(exec);

@Injectable()
export class CaptureService implements OnModuleInit {
  private isCapturing = false;
  private captureProcess: any = null;
  private readonly tmpDir = path.join(process.cwd(), 'tmp');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CaptureConfig,
    private readonly configService: ConfigService,
  ) {
    // 确保临时目录存在
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  async onModuleInit() {
    console.log('✅ 后端启动，自动抓包开始...');
    await this.startCapture(); // 默认启动抓包
  }

  async startCapture(interfaceName: string = 'eth0') {
    if (this.isCapturing) {
      throw new Error('Capture is already running');
    }

    // 从配置文件或环境变量获取接口名
    const configInterface = this.configService.get('CAPTURE_INTERFACE');
    const selectedInterface = interfaceName || configInterface || this.config.defaultInterface;
    
    // 确定输出文件路径
    const outputFile = path.join(this.tmpDir, 'packets.json');
    if (fs.existsSync(outputFile)) {
      fs.writeFileSync(outputFile, '[]'); // 清空之前的内容
    }
    
    // 使用配置获取完整的tshark命令
    const tsharkCommand = this.config.getTsharkCommand(selectedInterface, outputFile);
    
    console.log(`执行捕获命令: ${tsharkCommand}`);

    try {
      // 启动捕获进程
      this.captureProcess = exec(tsharkCommand, { shell: 'cmd.exe' }); // Windows环境下使用cmd.exe
      this.isCapturing = true;
      
      // 监听错误和退出
      this.captureProcess.stderr.on('data', (data) => {
        console.error(`tshark错误: ${data}`);
      });
      
      this.captureProcess.on('exit', (code) => {
        console.log(`tshark进程退出，退出码: ${code}`);
        if (code !== 0 && this.isCapturing) {
          console.error('tshark异常退出，尝试重新启动...');
          setTimeout(() => this.startCapture(selectedInterface), 5000);
        }
        this.isCapturing = false;
      });

      // 启动数据处理进程
      this.processCapturedData();

      return { 
        message: 'Capture started successfully', 
        interface: selectedInterface,
        outputFile
      };
    } catch (error) {
      console.error(`启动捕获失败:`, error);
      throw new Error(`Failed to start capture: ${error.message}`);
    }
  }

  async stopCapture() {
    if (!this.isCapturing) {
      throw new Error('No capture is running');
    }

    try {
      this.captureProcess.kill();
      this.isCapturing = false;
      return { message: 'Capture stopped successfully' };
    } catch (error) {
      throw new Error(`Failed to stop capture: ${error.message}`);
    }
  }

  private async processCapturedData() {
    const outputFile = path.join(this.tmpDir, 'packets.json');
    
    // 定期检查文件变化并处理数据
    setInterval(async () => {
      if (!this.isCapturing) return;

      try {
        // 检查文件是否存在且有内容
        if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 0) {
          try {
            // 读取文件内容
            const data = fs.readFileSync(outputFile, 'utf-8');
            
            // 解析JSON，尝试处理不同的格式情况
            let packets;
            
            // 尝试直接解析为JSON数组
            try {
              packets = JSON.parse(data);
              // 确保packets是数组
              if (!Array.isArray(packets)) {
                packets = [packets]; // 如果是单个对象，转为数组
              }
            } catch (jsonError) {
              // 如果直接解析失败，尝试逐行解析
              console.error('直接JSON解析失败，尝试逐行解析:', jsonError);
              packets = [];
              const lines = data.split('\n').filter(line => line.trim());
              
              for (const line of lines) {
                try {
                  const packet = JSON.parse(line);
                  packets.push(packet);
                } catch (lineError) {
                  // 忽略无法解析的行
                  console.error('无法解析行:', line);
                }
              }
            }
            
            console.log(`读取到 ${packets.length} 个数据包`);
            
            // 处理并存储数据
            for (const packet of packets) {
              await this.storePacket(packet);
            }

            // 清空文件
            fs.writeFileSync(outputFile, '[]');
          } catch (parseError) {
            console.error('处理捕获数据失败:', parseError);
            // 文件可能被损坏，清空它
            fs.writeFileSync(outputFile, '[]');
          }
        }
      } catch (error) {
        console.error('处理捕获数据时出错:', error);
      }
    }, this.config.processInterval); // 使用配置的处理间隔
  }

  private async storePacket(packetData: any) {
    try {
      // 解析数据包
      const packet = this.parsePacket(packetData);

      // 存储到数据库
      await this.prisma.packet.create({
        data: {
          timestamp: new Date(packet.timestamp),
          sourceMac: packet.sourceMac,
          destinationMac: packet.destinationMac,
          sourceIp: packet.sourceIp,
          destinationIp: packet.destinationIp,
          protocol: packet.protocol,
          sourcePort: packet.sourcePort,
          destinationPort: packet.destinationPort,
          length: packet.length,
          tcpFlags: packet.tcpFlags,
          payload: packet.payload,
          rawData: JSON.stringify(packet.rawData)
        }
      });
    } catch (error) {
      console.error('Error storing packet:', error);
    }
  }

  private parsePacket(packetData: any) {
    try {
      // 确保_source和layers存在
      if (!packetData || !packetData._source || !packetData._source.layers) {
        throw new Error('无效的数据包格式: 缺少_source或layers');
      }
      
      // 解析tshark输出的JSON数据
      const layers = packetData._source.layers;
      
      // 检查必要的层是否存在
      if (!layers.frame) {
        throw new Error('无效的数据包格式: 缺少frame层');
      }
      
      if (!layers.ip) {
        throw new Error('无效的数据包格式: 缺少ip层');
      }
      
      // 使用可选链和默认值来防止空值访问
      return {
        timestamp: layers.frame['frame.time'] 
          ? new Date(layers.frame['frame.time']) 
          : new Date(),
        sourceMac: layers.eth?.['eth.src'] || null,
        destinationMac: layers.eth?.['eth.dst'] || null,
        sourceIp: layers.ip['ip.src'] || '0.0.0.0',
        destinationIp: layers.ip['ip.dst'] || '0.0.0.0',
        protocol: layers.ip['ip.proto'] || 'UNKNOWN',
        sourcePort: parseInt(layers.tcp?.['tcp.srcport'] || layers.udp?.['udp.srcport'] || '0'),
        destinationPort: parseInt(layers.tcp?.['tcp.dstport'] || layers.udp?.['udp.dstport'] || '0'),
        length: parseInt(layers.frame['frame.len'] || '0'),
        tcpFlags: layers.tcp?.['tcp.flags'] || null,
        payload: layers.data?.['data.data'] || null,
        rawData: packetData
      };
    } catch (error) {
      console.error('数据包解析错误:', error);
      // 返回默认数据包对象，避免上层函数崩溃
      return {
        timestamp: new Date(),
        sourceMac: null,
        destinationMac: null,
        sourceIp: '0.0.0.0',
        destinationIp: '0.0.0.0',
        protocol: 'UNKNOWN',
        sourcePort: 0,
        destinationPort: 0,
        length: 0,
        tcpFlags: null,
        payload: null,
        rawData: packetData
      };
    }
  }

  async getCaptureStatus() {
    return {
      isCapturing: this.isCapturing,
      interface: this.configService.get('CAPTURE_INTERFACE'),
      tmpDir: this.tmpDir
    };
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