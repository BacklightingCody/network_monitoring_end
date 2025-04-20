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

  @Get()
  async getCaptureStatus() {
    return this.captureService.getCaptureStatus();
  }

  @Post('start')
  async startCapture(@Body('interface') interfaceName: string) {
    return this.captureService.startCapture(interfaceName);
  }

  @Post('stop')
  async stopCapture() {
    return this.captureService.stopCapture();
  }

  @Get('interfaces')
  async getInterfaces() {
    try {
      const interfaces = await this.captureService.getAvailableInterfaces();
      return { 
        success: true, 
        interfaces,
        count: interfaces.length,
        message: '成功获取网络接口列表'
      };
    } catch (error) {
      return { 
        success: false, 
        message: `获取网络接口失败: ${error.message}`,
        error: error.toString()
      };
    }
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
  async getLatestPackets(@Query('limit') limit: string = '20') {
    try {
      const packets = await this.captureService.getLatestCapturedPackets(parseInt(limit, 10));
      return {
        success: true,
        count: packets.length,
        packets
      };
    } catch (error) {
      return {
        success: false,
        message: `获取最新数据包失败: ${error.message}`,
        error: error.toString()
      };
    }
  }
}