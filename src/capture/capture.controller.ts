import { Controller, Get, Post, Body, Query } from '@nestjs/common';
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
  async startCapture(@Body() params: CaptureParams) {
    return this.captureService.startCapture(params);
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