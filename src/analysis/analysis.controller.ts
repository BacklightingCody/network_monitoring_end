import { Controller, Get, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('anomalies')
  async getAnomalies() {
    try {
      return await this.analysisService.getAllAnomalies();
    } catch (error) {
      throw new HttpException(
        `获取异常记录失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getTrafficStats() {
    try {
      return await this.analysisService.getTrafficStats();
    } catch (error) {
      throw new HttpException(
        `获取流量统计失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('model-info')
  async getModelInfo() {
    try {
      return await this.analysisService.getModelInfo();
    } catch (error) {
      throw new HttpException(
        `获取模型信息失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('train-model')
  async trainModel() {
    try {
      return await this.analysisService.trainModel();
    } catch (error) {
      throw new HttpException(
        `模型训练失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze')
  async analyzeTraffic(@Body() filter: any) {
    try {
      return await this.analysisService.analyzeTrafficByCondition(filter);
    } catch (error) {
      throw new HttpException(
        `流量分析失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 