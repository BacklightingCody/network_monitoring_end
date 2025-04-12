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

  @Post('start')
  async startCapture(@Body('interface') interfaceName?: string) {
    return this.captureService.startCapture(interfaceName);
  }

  @Post('stop')
  async stopCapture() {
    return this.captureService.stopCapture();
  }

  @Get('status')
  async getCaptureStatus() {
    return this.captureService.getCaptureStatus();
  }

  @Get('latest')
  async getLatestPackets(@Query('limit') limit: string = '100') {
    return this.captureService.getLatestCapturedPackets(parseInt(limit, 10));
  }

  @Get('interfaces')
  async getInterfaces() {
    return this.captureService.getAvailableInterfaces();
  }
}