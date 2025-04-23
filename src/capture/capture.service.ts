import { Injectable, OnModuleInit } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
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
import { Logger } from '@nestjs/common';

const execAsync = promisify(exec);

@Injectable()
export class CaptureService implements OnModuleInit {
  private isCapturing = false;
  private captureProcess: any = null;
  private readonly tmpDir = path.join(process.cwd(), 'tmp');
  private isProcessing = false; // 添加处理锁，防止并发处理
  private captureId = 0; // 用于生成唯一的文件名
  private readonly logger = new Logger(CaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CaptureConfig,
    private readonly configService: ConfigService,
  ) {
    // 确保临时目录存在
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }

    // 检查数据库连接状态
    this.checkDatabaseConnection().catch(error => {
      console.error('数据库连接检查失败:', error);
    });
  }

  // 检查数据库连接状态
  private async checkDatabaseConnection() {
    try {
      // 尝试一个简单的查询
      const count = await this.prisma.packet.count();
      console.log(`数据库连接成功, 当前记录数: ${count}`);
    } catch (error) {
      console.error('无法连接到数据库:', error);
      console.error('请确保PostgreSQL服务正在运行，并且连接参数正确:');
      console.error('DATABASE_URL=', process.env.DATABASE_URL);
    }
  }

  async onModuleInit() {
    console.log('✅ 后端启动，准备网络捕获...');
    
    // 获取并打印可用网卡列表，帮助调试
    try {
      // 检查数据库包表是否有数据
      const packetCount = await this.prisma.packet.count();
      console.log(`数据库中现有数据包数量: ${packetCount}`);
      
      const interfaces = await this.getAvailableInterfaces();
      console.log('可用网络接口列表:');
      interfaces.forEach((intf, index) => {
        console.log(`  ${index + 1}. ${intf}`);
      });
      
      // 从环境变量获取配置的接口
      const configInterface = this.configService.get('CAPTURE_INTERFACE');
      console.log(`从环境变量读取的网络接口配置: ${configInterface || '未配置'}`);
      
      // 使用环境变量配置的接口或第一个可用接口
      const selectedInterface = configInterface || interfaces[0];
      
      if (selectedInterface) {
        console.log(`选择网络接口: ${selectedInterface}`);
        // 确保tshark可用
        try {
          const { stdout } = await execAsync(`${this.config.tsharkPath} --version`);
          console.log(`检测到tshark版本: ${stdout.split('\n')[0]}`);
          
          // 启动捕获
          await this.startCapture(selectedInterface);
          console.log(`成功启动网络捕获，使用接口: ${selectedInterface}`);
        } catch (tsharkError) {
          console.error('tshark命令执行失败:', tsharkError);
          console.error('请确保tshark已正确安装且路径配置正确');
          console.error(`当前配置的tshark路径: ${this.config.tsharkPath}`);
          console.error('捕获未能启动，实时流量数据将不可用');
        }
      } else {
        console.error('找不到可用的网络接口，捕获未启动');
      }
    } catch (error) {
      console.error('获取网络接口列表失败:', error);
      console.log('尝试使用默认网络接口...');
      // 回退到默认接口
      await this.startCapture();
    }
  }

  async startCapture(interfaceName?: string) {
    if (this.isCapturing) {
      throw new Error('Capture is already running');
    }

    try {
      // 如果没有提供接口名称，尝试获取可用接口
      if (!interfaceName) {
        const interfaces = await this.getAvailableInterfaces();
        console.log('可用网络接口:', interfaces);
        
        // 从环境变量或配置获取
        const configInterface = this.configService.get('CAPTURE_INTERFACE');
        
        if (configInterface) {
          interfaceName = configInterface;
        } else if (interfaces.length > 0) {
          // 尝试找到WLAN或无线接口
          const wlanInterface = interfaces.find(intf => 
            intf.toLowerCase().includes('wlan') || 
            intf.toLowerCase().includes('wi-fi') ||
            intf.toLowerCase().includes('wireless')
          );
          
          // 使用找到的WLAN接口或第一个可用接口
          interfaceName = wlanInterface || interfaces[0];
          console.log('自动选择网络接口:', interfaceName);
        } else {
          throw new Error('找不到可用的网络接口');
        }
      }
      
      // 生成唯一的输出文件路径（此处文件不再被使用，因为我们直接处理stdout）
      this.captureId++;
      const timestamp = new Date().getTime();
      const outputFile = path.join(this.tmpDir, `packets-${timestamp}-${this.captureId}.json`);
      
      // 使用配置获取完整的tshark命令
      const tsharkCommand = this.config.getTsharkCommand(interfaceName, outputFile);
      
      console.log(`执行捕获命令: ${tsharkCommand}`);

      // 启动捕获进程
      this.captureProcess = exec(tsharkCommand, { shell: 'cmd.exe' }); // Windows环境下使用cmd.exe
      this.isCapturing = true;
      
      // 监听标准输出，直接处理实时数据
      this.captureProcess.stdout.on('data', (data) => {
        // 调用processOutput方法处理数据
        this.processOutput(data);
      });
      
      // 监听错误和退出
      this.captureProcess.stderr.on('data', (data) => {
        console.error(`tshark错误: ${data}`);
      });
      
      this.captureProcess.on('exit', async (code) => {
        console.log(`tshark进程退出，退出码: ${code}`);
        
        this.isCapturing = false;
        
        // 如果需要继续捕获且不是正常退出
        if (code !== 0 && this.isCapturing) {
          console.error('tshark异常退出，尝试重新启动...');
          setTimeout(() => this.startCapture(interfaceName), 5000);
        }
      });

      return { 
        message: 'Capture started successfully', 
        interface: interfaceName
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

  // 检查文件是否可访问
  private async checkFileAccessible(filePath: string, maxRetries = 5): Promise<boolean> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await fsPromises.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
        return true;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error(`文件 ${filePath} 不可访问，已达到最大重试次数`);
          return false;
        }
        // 等待时间随重试次数增加
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    
    return false;
  }

  // 处理单个捕获文件
  private async processCapturedFile(filePath: string) {
    // 如果已经在处理中，则跳过
    if (this.isProcessing) {
      console.log('已有处理任务在进行中，跳过此次处理');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // 检查文件是否存在且有内容
      const fileStats = await fsPromises.stat(filePath);
      
      if (fileStats.size > 0) {
        try {
          // 读取文件内容（使用异步方法）
          const data = await fsPromises.readFile(filePath, 'utf-8');
          // console.log(`读取到文件内容: ${data.substring(0, 500)}...`); // 打印前500个字符
          
          // 解析JSON，尝试处理不同的格式情况
          let packets = [];
          
          // 尝试直接解析为JSON数组
          try {
            // 如果文件只有空字符，跳过处理
            if (data.trim() === '') {
              console.log('文件内容为空，跳过处理');
              return;
            }
            
            const parsed = JSON.parse(data);
            
            // 确定数据格式
            if (Array.isArray(parsed)) {
              // 已经是数组格式
              packets = parsed;
            } else if (parsed._source || parsed.layers) {
              // 单个数据包
              packets = [parsed];
            } else if (parsed.hasOwnProperty('packets')) {
              // tshark输出的包含packets字段的JSON格式
              packets = parsed.packets;
            } else {
              // 未知格式，尝试找出所有可能的数据包字段
              const possiblePacketFields = ['packets', 'frames', 'data', 'records'];
              for (const field of possiblePacketFields) {
                if (parsed[field] && Array.isArray(parsed[field])) {
                  packets = parsed[field];
                  break;
                }
              }
              
              // 如果还是没有找到数组，把整个对象当作一个数据包
              if (packets.length === 0) {
                packets = [parsed];
              }
            }
          } catch (jsonError) {
            // 如果直接解析失败，尝试逐行解析
            console.error('JSON解析失败，尝试逐行解析:', jsonError);
            
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
          
          console.log(`从文件 ${filePath} 解析到 ${packets.length} 个数据包`);
          
          if (packets.length === 0) {
            console.error('解析后未找到有效数据包');
            // 保存原始内容到日志文件，以便分析
            const errorLogPath = path.join(this.tmpDir, `parse-error-${Date.now()}.log`);
            await fsPromises.writeFile(errorLogPath, data);
            console.log(`已保存解析失败内容到: ${errorLogPath}`);
            return;
          }
          
          // 批量处理数据包
          const batchSize = 50; // 减小批次大小，避免处理过大数据量
          const validPackets = [];
          
          for (const packetData of packets) {
            try {
              const packet = this.parsePacket(packetData);
              if (this.validatePacket(packet)) {
                validPackets.push(packet);
              }
            } catch (parseError) {
              console.error('数据包解析错误:', parseError);
            }
          }
          
          console.log(`验证后有效数据包: ${validPackets.length}/${packets.length}`);
          
          // 分批存储有效数据包
          if (validPackets.length > 0) {
            for (let i = 0; i < validPackets.length; i += batchSize) {
              const batch = validPackets.slice(i, i + batchSize);
              await this.storeBatch(batch);
            }
            console.log(`成功存储 ${validPackets.length} 个数据包`);
          } else {
            console.error('没有找到有效的数据包，跳过存储');
          }
          
          // 处理完成后，删除文件（使用异步方法）
          try {
            await fsPromises.unlink(filePath);
            console.log(`成功删除文件: ${filePath}`);
          } catch (unlinkError) {
            console.error(`删除文件失败 ${filePath}:`, unlinkError);
          }
        } catch (parseError) {
          console.error('处理捕获数据失败:', parseError);
        }
      } else {
        console.log(`文件 ${filePath} 为空，跳过处理`);
      }
    } catch (error) {
      console.error('处理捕获数据时出错:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatch(batch: any[]) {
    // 此方法已不再使用，由processCapturedFile方法直接调用parsePacket和storeBatch
    console.log('processBatch方法已弃用，请使用直接处理逻辑');
    return;
  }

  private async storeBatch(packets: any[]) {
    // 重试机制
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // 确保每个数据包对象包含必要的字段
        const formattedPackets = packets.map(packet => {
          try {
            return {
              timestamp: packet.timestamp,
              sourceMac: packet.sourceMac || null,
              destinationMac: packet.destinationMac || null,
              sourceIp: packet.sourceIp || '0.0.0.0',
              destinationIp: packet.destinationIp || '0.0.0.0',
              protocol: packet.protocol || 'UNKNOWN',
              sourcePort: packet.sourcePort || 0,
              destinationPort: packet.destinationPort || 0,
              length: packet.length || 0,
              tcpFlags: packet.tcpFlags || null,
              payload: packet.payload || null,
              applicationData: packet.applicationData || null,
              rawData: typeof packet.rawData === 'string' 
                ? packet.rawData.substring(0, 10000) // 限制长度避免数据过大
                : JSON.stringify(packet.rawData).substring(0, 10000)
            };
          } catch (e) {
            console.error('格式化数据包失败:', e);
            return null;
          }
        }).filter(p => p !== null); // 过滤掉格式化失败的包
        
        if (formattedPackets.length === 0) {
          console.log('没有有效的数据包需要存储');
          return 0;
        }

        // 使用Prisma批量创建记录
        const result = await this.prisma.packet.createMany({
          data: formattedPackets,
          skipDuplicates: true, // 跳过重复记录
        });

        console.log(`已存储 ${result.count} 个数据包`);
        
        // 如果存储数量与期望不符，记录警告
        if (result.count < formattedPackets.length) {
          console.warn(`部分数据包未能存储: ${formattedPackets.length - result.count}个被跳过`);
        }
        console.log(`成功保存 ${result.count} 条数据包到数据库`);
        return result.count;
      } catch (error) {
        retryCount++;
        console.error(`数据包存储失败 (尝试 ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error('达到最大重试次数，放弃存储');
          return 0;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    return 0; // 如果所有重试都失败
  }

  private validatePacket(packet: any): boolean {
    // 基本验证：确保包含必要字段且不是空包
    if (!packet) return false;
    
    // MAC地址验证
    if (packet.sourceMac && !this.isValidMacAddress(packet.sourceMac)) {
      return false;
    }
    
    if (packet.destinationMac && !this.isValidMacAddress(packet.destinationMac)) {
      return false;
    }
    
    // IP地址验证
    if (packet.sourceIp !== '0.0.0.0' && !this.isValidIpAddress(packet.sourceIp)) {
      return false;
    }
    
    if (packet.destinationIp !== '0.0.0.0' && !this.isValidIpAddress(packet.destinationIp)) {
      return false;
    }
    
    // 如果源IP和目标IP都是0.0.0.0，需要至少有一个有效的MAC地址
    if (packet.sourceIp === '0.0.0.0' && packet.destinationIp === '0.0.0.0') {
      if (!packet.sourceMac && !packet.destinationMac) {
        return false;
      }
    }
    
    // 端口验证
    if (packet.sourcePort < 0 || packet.sourcePort > 65535) {
      return false;
    }
    
    if (packet.destinationPort < 0 || packet.destinationPort > 65535) {
      return false;
    }
    
    // 长度验证
    if (packet.length <= 0) {
      return false;
    }
    
    return true;
  }

  private parsePacket(packetData: any) {
    try {
      // 处理不同的JSON数据包格式
      let layers = null;
      
      // 防止undefined或null
      if (!packetData) {
        return this.createDefaultPacket('数据包为空');
      }
      
      // 复杂格式处理逻辑
      // 支持多种JSON格式 - 使用类型检查来安全地处理数据
      if (typeof packetData === 'object') {
        // tshark输出的ElasticSearch格式: {_source: {layers: {...}}}
        if (packetData._source && packetData._source.layers) {
          layers = packetData._source.layers;
        }
        // 标准tshark JSON格式: {layers: {...}}
        else if (packetData.layers) {
          layers = packetData.layers;
        }
        // 直接包含字段的对象 { "eth.src": [...], ... }
        else if (Object.keys(packetData).some(key => key.includes('.'))) {
          layers = packetData;
        }
        // 某些新的JSON格式，直接包含frame、eth、ip等属性
        else if (packetData.frame || packetData.eth || packetData.ip) {
          // 构建兼容的层结构
          layers = {};
          
          // 处理frame信息
          if (packetData.frame) {
            // 安全地访问嵌套属性
            this.copyNestedProperties(packetData.frame, layers, 'frame');
          }
          
          // 处理eth信息
          if (packetData.eth) {
            this.copyNestedProperties(packetData.eth, layers, 'eth');
          }
          
          // 处理ip信息
          if (packetData.ip) {
            this.copyNestedProperties(packetData.ip, layers, 'ip');
          }
          
          // 处理ipv6信息
          if (packetData.ipv6) {
            this.copyNestedProperties(packetData.ipv6, layers, 'ipv6');
          }
          
          // 处理tcp信息
          if (packetData.tcp) {
            this.copyNestedProperties(packetData.tcp, layers, 'tcp');
          }
          
          // 处理udp信息
          if (packetData.udp) {
            this.copyNestedProperties(packetData.udp, layers, 'udp');
          }
          
          // 处理http信息
          if (packetData.http) {
            this.copyNestedProperties(packetData.http, layers, 'http');
          }
          
          // 处理tls信息
          if (packetData.tls) {
            this.copyNestedProperties(packetData.tls, layers, 'tls');
          }
          
          // 处理dns信息
          if (packetData.dns) {
            this.copyNestedProperties(packetData.dns, layers, 'dns');
          }
          
          // 处理icmp信息
          if (packetData.icmp) {
            this.copyNestedProperties(packetData.icmp, layers, 'icmp');
          }
          
          // 处理协议信息
          if (packetData.protocol) {
            layers['_ws.col.protocol'] = [packetData.protocol];
          } else if (packetData._ws && packetData._ws.col && packetData._ws.col.protocol) {
            layers['_ws.col.protocol'] = [packetData._ws.col.protocol];
          }
        }
        // 扁平化的JSON结构
        else if (packetData.timestamp || packetData.source_ip || packetData.destination_ip) {
          layers = {};
          // 转换扁平化的字段到我们期望的格式
          if (packetData.timestamp) {
            try {
              // 尝试将时间戳转换为epoch格式
              const date = new Date(packetData.timestamp);
              if (!isNaN(date.getTime())) {
                layers['frame.time_epoch'] = [String(date.getTime() / 1000)];
                layers['frame.time'] = [packetData.timestamp];
              }
            } catch (e) {
              // 时间戳转换失败，使用当前时间
              const now = new Date();
              layers['frame.time_epoch'] = [String(now.getTime() / 1000)];
              layers['frame.time'] = [now.toISOString()];
            }
          }
          
          // 映射其他字段
          if (packetData.source_mac) layers['eth.src'] = [packetData.source_mac];
          if (packetData.destination_mac) layers['eth.dst'] = [packetData.destination_mac];
          if (packetData.source_ip) layers['ip.src'] = [packetData.source_ip];
          if (packetData.destination_ip) layers['ip.dst'] = [packetData.destination_ip];
          if (packetData.source_port !== undefined) layers['tcp.srcport'] = [String(packetData.source_port)];
          if (packetData.destination_port !== undefined) layers['tcp.dstport'] = [String(packetData.destination_port)];
          if (packetData.protocol) layers['_ws.col.protocol'] = [packetData.protocol];
          if (packetData.length !== undefined) layers['frame.len'] = [String(packetData.length)];
        }
      }
      
      // 如果无法确定包的格式，返回默认包
      if (!layers) {
        console.log('无法识别的数据包格式:', JSON.stringify(packetData).substring(0, 150));
        return this.createDefaultPacket('无法识别的数据包格式: ' + (typeof packetData));
      }
      
      // 提取各字段
      let timestamp = new Date();
      let sourceMac = null;
      let destinationMac = null;
      let sourceIp = '0.0.0.0';
      let destinationIp = '0.0.0.0';
      let protocol = 'UNKNOWN';
      let sourcePort = 0;
      let destinationPort = 0;
      let length = 0;
      
      // 处理时间戳 - 尝试多种字段
      try {
        if (this.getFirstValue(layers, 'frame.time_epoch')) {
          const epochStr = this.getFirstValue(layers, 'frame.time_epoch');
          const epochNum = parseFloat(epochStr);
          if (!isNaN(epochNum)) {
            timestamp = new Date(epochNum * 1000); // 转换为毫秒
          }
        } else if (this.getFirstValue(layers, 'frame.time')) {
          const timeStr = this.getFirstValue(layers, 'frame.time');
          timestamp = new Date(timeStr);
        }
        
        // 如果时间戳无效，使用当前时间
        if (isNaN(timestamp.getTime())) {
          timestamp = new Date();
        }
      } catch (error) {
        this.logger.debug(`时间戳解析错误: ${error.message}, 使用当前时间`);
        timestamp = new Date();
      }
      
      // MAC地址处理 - 验证格式
      const rawSourceMac = this.getFirstValue(layers, 'eth.src');
      if (rawSourceMac && this.isValidMacAddress(rawSourceMac)) {
        sourceMac = this.formatMacAddress(rawSourceMac);
      }
      
      const rawDestMac = this.getFirstValue(layers, 'eth.dst');
      if (rawDestMac && this.isValidMacAddress(rawDestMac)) {
        destinationMac = this.formatMacAddress(rawDestMac);
      }
      
      // IP地址处理 - 尝试IPv4和IPv6，并验证格式
      const rawSourceIp = this.getFirstValue(layers, 'ip.src') || this.getFirstValue(layers, 'ipv6.src');
      if (rawSourceIp && this.isValidIpAddress(rawSourceIp)) {
        sourceIp = rawSourceIp;
      } else {
        sourceIp = '0.0.0.0'; // 默认值
      }
      
      const rawDestIp = this.getFirstValue(layers, 'ip.dst') || this.getFirstValue(layers, 'ipv6.dst');
      if (rawDestIp && this.isValidIpAddress(rawDestIp)) {
        destinationIp = rawDestIp;
      } else {
        destinationIp = '0.0.0.0'; // 默认值
      }
      
      // 协议处理 - 保证有效值
      const rawProtocol = this.getFirstValue(layers, '_ws.col.protocol') || 
                           this.getFirstValue(layers, 'frame.protocols');
      
      if (rawProtocol && rawProtocol.trim()) {
        // 尝试提取第一个有效协议
        const protocolParts = rawProtocol.split(':');
        if (protocolParts.length > 0) {
          // 取最后一个作为协议名称，通常是最具体的
          const lastProto = protocolParts[protocolParts.length - 1].trim().toUpperCase();
          if (lastProto) {
            protocol = lastProto;
          }
        } else {
          protocol = rawProtocol.trim().toUpperCase();
        }
      }
      
      // 端口处理 - 尝试TCP和UDP，确保是有效的数字
      const srcPortTcp = this.getFirstValue(layers, 'tcp.srcport');
      const srcPortUdp = this.getFirstValue(layers, 'udp.srcport');
      const srcPortRaw = srcPortTcp || srcPortUdp;
      
      if (srcPortRaw) {
        // 尝试从16进制或10进制解析
        if (srcPortRaw.startsWith('0x')) {
          sourcePort = parseInt(srcPortRaw, 16);
        } else {
          sourcePort = parseInt(srcPortRaw, 10);
        }
        
        // 确保端口是有效范围 (0-65535)
        if (isNaN(sourcePort) || sourcePort < 0 || sourcePort > 65535) {
          sourcePort = 0;
        }
      }
      
      const dstPortTcp = this.getFirstValue(layers, 'tcp.dstport');
      const dstPortUdp = this.getFirstValue(layers, 'udp.dstport');
      const dstPortRaw = dstPortTcp || dstPortUdp;
      
      if (dstPortRaw) {
        // 尝试从16进制或10进制解析
        if (dstPortRaw.startsWith('0x')) {
          destinationPort = parseInt(dstPortRaw, 16);
        } else {
          destinationPort = parseInt(dstPortRaw, 10);
        }
        
        // 确保端口是有效范围 (0-65535)
        if (isNaN(destinationPort) || destinationPort < 0 || destinationPort > 65535) {
          destinationPort = 0;
        }
      }
      
      // 长度处理 - 确保是有效的数字
      const rawLength = this.getFirstValue(layers, 'frame.len') || this.getFirstValue(layers, 'ip.len');
      if (rawLength) {
        length = parseInt(rawLength, 10);
        if (isNaN(length) || length < 0) {
          length = 0;
        }
      }
      
      // 提取TCP标志（如果有）
      let tcpFlags = null;
      const rawTcpFlags = this.getFirstValue(layers, 'tcp.flags');
      if (rawTcpFlags) {
        tcpFlags = rawTcpFlags;
      }
      
      // 构建负载数据（如果有）
      let payload = null;
      // TCP或HTTP数据
      const httpData = this.getFirstValue(layers, 'http.request') || 
                       this.getFirstValue(layers, 'http.response') ||
                       this.getFirstValue(layers, 'http.file_data');
                       
      const rawData = this.getFirstValue(layers, 'data') || httpData;
      
      if (rawData) {
        try {
          payload = rawData.substring(0, 500); // 限制大小
        } catch (e) {
          payload = null;
        }
      }
      
      // 返回标准化的包数据
      return {
        timestamp: timestamp,
        sourceMac,
        destinationMac,
        sourceIp,
        destinationIp,
        protocol,
        sourcePort,
        destinationPort,
        length,
        tcpFlags, 
        payload,
        applicationData: null,
        rawData: JSON.stringify(packetData).substring(0, 1000) // 限制原始数据大小
      };
    } catch (error) {
      console.error('数据包解析错误:', error);
      // 返回默认数据包对象
      return this.createDefaultPacket('解析异常: ' + error.message, packetData);
    }
  }

  // 辅助方法：复制嵌套属性到layers对象
  private copyNestedProperties(source: any, target: any, prefix: string): void {
    if (!source || typeof source !== 'object') return;
    
    // 处理平面属性
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const value = source[key];
        
        // 跳过嵌套对象，除非是数组
        if (typeof value !== 'object' || Array.isArray(value)) {
          const fullKey = `${prefix}.${key}`;
          
          // 确保值是数组形式
          if (Array.isArray(value)) {
            target[fullKey] = value.map(item => String(item));
          } else {
            target[fullKey] = [String(value)];
          }
        }
        // 如果是嵌套对象但不是数组，递归处理
        else if (typeof value === 'object' && !Array.isArray(value)) {
          this.copyNestedProperties(value, target, `${prefix}.${key}`);
        }
      }
    }
  }

  // 辅助方法：安全地获取字段的第一个值
  private getFirstValue(layers: any, fieldName: string): string | null {
    try {
      if (!layers) return null;
      
      const value = layers[fieldName];
      
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0]);
      } else if (value !== undefined && value !== null) {
        return String(value);
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }

  // 创建默认数据包对象的辅助方法
  private createDefaultPacket(errorMessage: string, packetData?: any) {
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
      applicationData: null,
      error: errorMessage,
      rawData: packetData ? JSON.stringify(packetData).substring(0, 500) : 'null'
    };
  }

  async getCaptureStatus() {
    return {
      isCapturing: this.isCapturing,
      interface: this.configService.get('CAPTURE_INTERFACE'),
      tmpDir: this.tmpDir
    };
  }

  async saveToDatabase(): Promise<void> {
    // 查找所有捕获文件
    const files = await fsPromises.readdir(this.tmpDir);
    const jsonFiles = files.filter(file => file.startsWith('packets-') && file.endsWith('.json'));
    
    let totalSaved = 0;
    
    for (const file of jsonFiles) {
      const filePath = path.join(this.tmpDir, file);
      
      try {
        // 检查文件是否可访问
        const isAccessible = await this.checkFileAccessible(filePath);
        if (!isAccessible) {
          console.log(`文件 ${filePath} 不可访问，跳过处理`);
          continue;
        }
        
        // 处理文件
        await this.processCapturedFile(filePath);
      } catch (error) {
        console.error(`处理文件 ${filePath} 失败:`, error);
      }
    }
    
    console.log(`Total packets saved: ${totalSaved}`);
    return;
  }

  async getLatestCapturedPackets(limit: number = 100) {
    return this.prisma.packet.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getAvailableInterfaces(): Promise<string[]> {
    try {
      // 执行tshark -D命令获取网卡列表
      const { stdout } = await execAsync(`${this.config.tsharkPath} -D`, { shell: 'cmd.exe' });
      
      // 解析tshark输出结果
      const interfaceList = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line); // 过滤空行
      
      console.log('原始网卡列表输出:', interfaceList);
      
      // 处理Windows和Linux上不同的输出格式
      // Windows格式通常是: "1. \Device\NPF_{GUID} (网卡描述)"
      // 或者是: "1. 本地连接 (网卡描述)"
      // Linux格式通常是: "1. eth0 (网卡描述)"
      const parsedInterfaces = interfaceList.map(line => {
        // 尝试提取接口信息
        const match = line.match(/^(\d+)\.\s+(.+?)(?:\s+\((.+)\))?$/);
        if (match) {
          const index = match[1].trim();
          const interfaceId = match[2].trim();
          const description = match[3] ? match[3].trim() : '';
          
          // 返回包含索引、ID和描述的对象
          return {
            index,
            id: interfaceId,
            description,
            original: line,
            // 对于Windows，我们返回带引号的名称，例如"WLAN"
            displayName: (process.platform === 'win32' && !interfaceId.includes('\\')) 
              ? interfaceId 
              : index
          };
        }
        return null;
      }).filter(item => item !== null);
      
      console.log('解析后的网卡信息:', parsedInterfaces);
      
      // 返回网卡名称数组
      return parsedInterfaces.map(intf => intf.displayName);
    } catch (err) {
      console.error('获取网络接口列表失败:', err.message);
      throw err;
    }
  }

  /**
   * 处理tshark的输出数据
   */
  private processOutput(data: Buffer) {
    try {
      // 处理stdout输出的数据
      const dataStr = data.toString().trim();
      
      // 调试日志 - 确认接收到数据
      console.log(`接收到tshark数据: ${dataStr.length} 字节`);
      if (dataStr.length > 0 && process.env.RUNNING_ENV === 'dev') {
        console.log(`数据预览: ${dataStr.substring(0, 100)}...`);
      }

      // 如果数据为空，则直接返回
      if (!dataStr || dataStr.trim() === '') {
        console.log('接收到空数据，跳过处理');
        return;
      }

      // 尝试处理完整的JSON数据块
      try {
        let jsonObject = null;
        
        // 尝试处理完整的JSON对象
        if (dataStr.trim().startsWith('[') && dataStr.trim().endsWith(']')) {
          // 如果是JSON数组，直接解析
          jsonObject = JSON.parse(dataStr);
          console.log(`解析到JSON数组，包含 ${jsonObject.length} 个数据包`);
          
          // 处理每个数据包
          for (const packet of jsonObject) {
            this.handlePacket(packet);
          }
          return;
        } else if (dataStr.trim().startsWith('{') && dataStr.trim().endsWith('}')) {
          // 如果是单个JSON对象
          jsonObject = JSON.parse(dataStr);
          this.handlePacket(jsonObject);
          return;
        }
      } catch (jsonError) {
        console.log(`整体JSON解析失败，尝试逐行解析: ${jsonError.message}`);
      }

      // 将数据添加到缓冲区
      this.jsonBuffer = (this.jsonBuffer || '') + dataStr;
      
      // 尝试在缓冲区中查找完整的JSON对象
      this.processJsonBuffer();

    } catch (error) {
      console.error(`tshark输出数据处理错误: ${error.message}`);
    }
  }

  // 添加JSON缓冲区变量
  private jsonBuffer: string = '';

  // 处理JSON缓冲区，尝试提取完整的JSON对象
  private processJsonBuffer() {
    try {
      // 尝试找到JSON对象的开始和结束
      if (this.jsonBuffer.length > 0) {
        let processedCount = 0;
        let errorCount = 0;
        
        // 提取完整的JSON对象，可能包含{...}或[{...}]格式
        const extractAndProcessJson = () => {
          // 查找对象和数组的起始位置
          const objectStart = this.jsonBuffer.indexOf('{');
          const arrayStart = this.jsonBuffer.indexOf('[');
          
          if (objectStart === -1 && arrayStart === -1) {
            // 没有找到JSON对象的起始标记
            if (this.jsonBuffer.length > 10000) {
              // 如果缓冲区太大但没有有效的JSON，清空它
              console.log(`清空无效JSON缓冲区，大小: ${this.jsonBuffer.length}`);
              this.jsonBuffer = '';
            }
            return false;
          }
          
          // 确定哪个在前，使用它作为起始点
          const start = (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) 
            ? arrayStart 
            : objectStart;
          
          // 如果起始是'['，查找匹配的']'
          if (this.jsonBuffer[start] === '[') {
            // 寻找匹配的']'
            let depth = 0;
            let endPos = -1;
            
            for (let i = start; i < this.jsonBuffer.length; i++) {
              if (this.jsonBuffer[i] === '[') depth++;
              else if (this.jsonBuffer[i] === ']') {
                depth--;
                if (depth === 0) {
                  endPos = i;
                  break;
                }
              }
            }
            
            if (endPos !== -1) {
              // 提取并处理这个JSON数组
              const jsonStr = this.jsonBuffer.substring(start, endPos + 1);
              try {
                const jsonArray = JSON.parse(jsonStr);
                if (Array.isArray(jsonArray)) {
                  for (const item of jsonArray) {
                    this.handlePacket(item);
                    processedCount++;
                  }
                } else {
                  this.handlePacket(jsonArray);
                  processedCount++;
                }
                // 从缓冲区移除已处理的部分
                this.jsonBuffer = this.jsonBuffer.substring(endPos + 1);
                return true;
              } catch (error) {
                // 解析失败，可能不是有效的JSON
                console.log(`JSON数组解析失败: ${error.message}`);
                errorCount++;
                // 从缓冲区移除可能导致问题的部分
                this.jsonBuffer = this.jsonBuffer.substring(start + 1);
                return false;
              }
            } else {
              // 没有找到匹配的结束标记，可能数据不完整
              return false;
            }
          } 
          // 如果起始是'{'，查找匹配的'}'
          else if (this.jsonBuffer[start] === '{') {
            // 寻找匹配的'}'
            let depth = 0;
            let endPos = -1;
            
            for (let i = start; i < this.jsonBuffer.length; i++) {
              if (this.jsonBuffer[i] === '{') depth++;
              else if (this.jsonBuffer[i] === '}') {
                depth--;
                if (depth === 0) {
                  endPos = i;
                  break;
                }
              }
            }
            
            if (endPos !== -1) {
              // 提取并处理这个JSON对象
              const jsonStr = this.jsonBuffer.substring(start, endPos + 1);
              try {
                const jsonObject = JSON.parse(jsonStr);
                this.handlePacket(jsonObject);
                processedCount++;
                // 从缓冲区移除已处理的部分
                this.jsonBuffer = this.jsonBuffer.substring(endPos + 1);
                return true;
              } catch (error) {
                // 解析失败，可能不是有效的JSON
                console.log(`JSON对象解析失败: ${error.message}`);
                errorCount++;
                // 从缓冲区移除可能导致问题的部分
                this.jsonBuffer = this.jsonBuffer.substring(start + 1);
                return false;
              }
            } else {
              // 没有找到匹配的结束标记，可能数据不完整
              return false;
            }
          }
          
          return false;
        };
        
        // 循环提取和处理JSON对象，直到没有更多完整的对象
        let continueProcessing = true;
        const maxIterations = 100; // 防止无限循环
        let iterations = 0;
        
        while (continueProcessing && iterations < maxIterations) {
          continueProcessing = extractAndProcessJson();
          iterations++;
        }
        
        // 清理过长的缓冲区
        if (this.jsonBuffer.length > 100000) {
          console.log(`JSON缓冲区过大(${this.jsonBuffer.length})，重置`);
          this.jsonBuffer = this.jsonBuffer.substring(this.jsonBuffer.length - 50000);
        }
        
        console.log(`JSON缓冲区处理: 成功 ${processedCount} 条, 失败 ${errorCount} 条, 缓冲区大小: ${this.jsonBuffer.length}`);
      }
    } catch (error) {
      console.error(`处理JSON缓冲区错误: ${error.message}`);
      // 重置缓冲区以防止进一步的错误
      this.jsonBuffer = '';
    }
  }

  /**
   * 处理单个数据包
   * 解析并存储有效的数据包
   */
  private handlePacket(packetData: any) {
    try {
      // 解析数据包
      const packet = this.parsePacket(packetData);
      
      // 输出解析后的数据包
      if (process.env.RUNNING_ENV === 'dev') {
        console.log(
          `解析数据包: ${packet.sourceIp}:${packet.sourcePort} -> ${packet.destinationIp}:${packet.destinationPort} (${packet.protocol})`
        );
      }
      
      // 保存到数据库
      this.storeBatch([packet])
        .then((count) => {
          if (count > 0 && process.env.RUNNING_ENV === 'dev') {
            console.log(`成功保存数据包: ${packet.sourceIp} -> ${packet.destinationIp}`);
          }
        })
        .catch(error => {
          console.error('保存数据包失败:', error);
        });
    } catch (error) {
      console.error('处理数据包失败:', error);
    }
  }

  // 验证MAC地址格式
  private isValidMacAddress(mac: string): boolean {
    // 检查常见的MAC地址格式
    // 形如 xx:xx:xx:xx:xx:xx 或 xx-xx-xx-xx-xx-xx
    const normalizedMac = mac.toLowerCase().replace(/[^a-f0-9]/g, '');
    return normalizedMac.length === 12 && /^[a-f0-9]+$/i.test(normalizedMac);
  }
  
  // 格式化MAC地址
  private formatMacAddress(mac: string): string {
    // 规范化MAC地址格式为 xx:xx:xx:xx:xx:xx
    try {
      const normalizedMac = mac.toLowerCase().replace(/[^a-f0-9]/g, '');
      if (normalizedMac.length !== 12) return null;
      
      const pairs = [];
      for (let i = 0; i < 12; i += 2) {
        pairs.push(normalizedMac.substring(i, i + 2));
      }
      
      return pairs.join(':');
    } catch (e) {
      return null;
    }
  }
  
  // 验证IP地址格式
  private isValidIpAddress(ip: string): boolean {
    // IPv4格式验证
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (ipv4Pattern.test(ip)) {
      const parts = ip.split('.').map(part => parseInt(part, 10));
      return parts.every(part => part >= 0 && part <= 255);
    }
    
    // IPv6格式验证 - 简化验证
    const ipv6Pattern = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^::$|^::1$|^([0-9a-f]{1,4}:){1,7}:$|^:([0-9a-f]{1,4}:){1,7}$|^([0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}$|^([0-9a-f]{1,4}:){1,5}(:[0-9a-f]{1,4}){1,2}$|^([0-9a-f]{1,4}:){1,4}(:[0-9a-f]{1,4}){1,3}$|^([0-9a-f]{1,4}:){1,3}(:[0-9a-f]{1,4}){1,4}$|^([0-9a-f]{1,4}:){1,2}(:[0-9a-f]{1,4}){1,5}$|^[0-9a-f]{1,4}:(:[0-9a-f]{1,4}){1,6}$|^fe80:(:[0-9a-f]{0,4}){0,4}%[0-9a-z]+$|^::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])$|^([0-9a-f]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])$/i;
    return ipv6Pattern.test(ip.toLowerCase());
  }
}