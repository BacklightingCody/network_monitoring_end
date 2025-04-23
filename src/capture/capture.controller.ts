import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { CaptureService } from './capture.service';

interface CaptureParams {
  interface?: string;
  duration?: number;
  filter?: string;
  fields?: string[];
}

@Controller('capture')
export class CaptureController {
  constructor(private readonly captureService: CaptureService) {}

  @Get('status')
  async getCaptureStatus() {
    return this.captureService.getCaptureStatus();
  }

  @Post('start')
  async startCapture(@Body() body: { interface?: string }) {
    return this.captureService.startCapture(body.interface);
  }

  @Post('stop')
  async stopCapture() {
    return this.captureService.stopCapture();
  }

  @Get('interfaces')
  async getAvailableInterfaces() {
    return { interfaces: await this.captureService.getAvailableInterfaces() };
  }

  @Post('test')
  async testCapture(@Body('interface') interfaceName: string) {
    try {
      // 如果没有指定接口，获取所有接口并尝试第一个
      if (!interfaceName) {
        const interfaces = await this.captureService.getAvailableInterfaces();
        if (interfaces.length > 0) {
          interfaceName = interfaces[0];
        } else {
          return {
            success: false,
            message: '未找到可用的网络接口'
          };
        }
      }
      
      // 执行一个简短的捕获测试
      const result = await this.captureService.startCapture(interfaceName);
      
      // 2秒后停止捕获
      setTimeout(async () => {
        try {
          await this.captureService.stopCapture();
        } catch (e) {
          console.error('停止测试捕获失败:', e);
        }
      }, 2000);
      
      return {
        success: true,
        message: `正在对接口 ${interfaceName} 进行捕获测试`,
        result
      };
    } catch (error) {
      return {
        success: false,
        message: `测试捕获失败: ${error.message}`,
        error: error.toString()
      };
    }
  }

  @Get('latest')
  async getLatestCapturedPackets(@Query('limit') limit: string = '100') {
    const limitNum = parseInt(limit, 10) || 100;
    return this.captureService.getLatestCapturedPackets(limitNum);
  }

  @Post('test-data')
  async generateTestData() {
    // 生成一些测试数据包，用于前端调试
    const packets = [];
    const now = new Date();
    
    // 生成100个测试数据包，时间跨度为最近30分钟
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - (30 * 60 * 1000) + (i * 18000)); // 每18秒一个包
      
      packets.push({
        timestamp,
        sourceMac: '00:11:22:33:44:55',
        destinationMac: '66:77:88:99:AA:BB',
        sourceIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
        destinationIp: `10.0.0.${Math.floor(Math.random() * 255)}`,
        protocol: ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS'][Math.floor(Math.random() * 5)],
        sourcePort: Math.floor(Math.random() * 65535),
        destinationPort: [80, 443, 53, 8080, 22][Math.floor(Math.random() * 5)],
        length: Math.floor(Math.random() * 1500) + 100,
        tcpFlags: '0x0018',
        payload: 'test payload',
        applicationData: JSON.stringify({ test: 'data' }),
        rawData: 'raw test data'
      });
    }
    
    // 存储到数据库
    try {
      // 使用Prisma批量创建记录
      const result = await this.captureService['prisma'].packet.createMany({
        data: packets,
        skipDuplicates: true, // 跳过重复记录
      });
      
      return {
        message: `成功生成 ${result.count} 条测试数据包`,
        generatedCount: result.count,
        totalPackets: await this.captureService['prisma'].packet.count()
      };
    } catch (error) {
      return {
        error: `生成测试数据失败: ${error.message}`
      };
    }
  }
}