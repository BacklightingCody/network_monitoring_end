import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MlServiceConfig } from '../config/ml-service.config';
import { firstValueFrom } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';

@Injectable()
export class PythonService implements OnModuleInit {
  private readonly logger = new Logger(PythonService.name);
  private isServiceAvailable: boolean = false;

  constructor(
    private readonly httpService: HttpService,
    private readonly mlConfig: MlServiceConfig,
  ) {}

  async onModuleInit() {
    // 检查Python服务是否可用
    try {
      await this.checkServiceHealth();
      this.isServiceAvailable = true;
      this.logger.log('✅ Python 分析服务连接成功');
    } catch (error) {
      this.isServiceAvailable = false;
      this.logger.error(`❌ Python 分析服务连接失败: ${error.message}`);
    }
  }

  /**
   * 检查Python服务健康状态
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const healthEndpoint = this.mlConfig.getHealthEndpoint();
      const response = await firstValueFrom(
        this.httpService.get(healthEndpoint).pipe(
          timeout(this.mlConfig.getTimeout()),
          retry(2),
          catchError(error => {
            this.logger.error(`健康检查失败: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.data.status === 'ok';
    } catch (error) {
      this.logger.error(`健康检查失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(): Promise<any> {
    if (!this.isServiceAvailable) {
      return { status: 'service_unavailable', models: [] };
    }

    try {
      const modelInfoEndpoint = this.mlConfig.getModelInfoEndpoint();
      const response = await firstValueFrom(
        this.httpService.get(modelInfoEndpoint).pipe(
          timeout(this.mlConfig.getTimeout()),
          catchError(error => {
            this.logger.error(`获取模型信息失败: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`获取模型信息失败: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * 异常检测
   * @param packetFeatures 数据包特征
   */
  async detectAnomalies(packetFeatures: any[]): Promise<any> {
    if (!this.isServiceAvailable || packetFeatures.length === 0) {
      return { anomalies: [], status: 'service_unavailable' };
    }

    try {
      const anomalyEndpoint = this.mlConfig.getAnomalyEndpoint();
      const response = await firstValueFrom(
        this.httpService.post(anomalyEndpoint, { features: packetFeatures }).pipe(
          timeout(this.mlConfig.getTimeout()),
          retry(this.mlConfig.getRetryAttempts()),
          catchError(error => {
            this.logger.error(`异常检测失败: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`异常检测失败: ${error.message}`);
      return { 
        anomalies: [], 
        scores: Array(packetFeatures.length).fill(0),
        status: 'error', 
        error: error.message 
      };
    }
  }

  /**
   * 攻击分类
   * @param packetFeatures 数据包特征
   */
  async classifyTraffic(packetFeatures: any[]): Promise<any> {
    if (!this.isServiceAvailable || packetFeatures.length === 0) {
      return { classifications: [], status: 'service_unavailable' };
    }

    try {
      const attackEndpoint = this.mlConfig.getAttackEndpoint();
      const response = await firstValueFrom(
        this.httpService.post(attackEndpoint, { features: packetFeatures }).pipe(
          timeout(this.mlConfig.getTimeout()),
          retry(this.mlConfig.getRetryAttempts()),
          catchError(error => {
            this.logger.error(`攻击分类失败: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`攻击分类失败: ${error.message}`);
      return { 
        classifications: Array(packetFeatures.length).fill('unknown'),
        probabilities: Array(packetFeatures.length).fill([0.25, 0.25, 0.25, 0.25]),
        status: 'error', 
        error: error.message 
      };
    }
  }

  /**
   * 特征提取
   * @param packets 原始数据包
   */
  async extractFeatures(packets: any[]): Promise<any> {
    if (!this.isServiceAvailable || packets.length === 0) {
      return { features: [], status: 'service_unavailable' };
    }

    try {
      const featureEndpoint = this.mlConfig.getFeatureExtractionEndpoint();
      const response = await firstValueFrom(
        this.httpService.post(featureEndpoint, { packets }).pipe(
          timeout(this.mlConfig.getTimeout()),
          retry(this.mlConfig.getRetryAttempts()),
          catchError(error => {
            this.logger.error(`特征提取失败: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`特征提取失败: ${error.message}`);
      return { features: [], status: 'error', error: error.message };
    }
  }

  /**
   * 批量预测
   * @param packets 原始数据包
   */
  async batchPredict(packets: any[]): Promise<any> {
    if (!this.isServiceAvailable || packets.length === 0) {
      return { 
        anomalies: [], 
        classifications: [],
        status: 'service_unavailable' 
      };
    }

    try {
      const batchEndpoint = this.mlConfig.getBatchPredictionEndpoint();
      const response = await firstValueFrom(
        this.httpService.post(batchEndpoint, { packets }).pipe(
          timeout(this.mlConfig.getTimeout() * 2), // 批量处理可能需要更多时间
          retry(this.mlConfig.getRetryAttempts()),
          catchError(error => {
            this.logger.error(`批量预测失败: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`批量预测失败: ${error.message}`);
      return { 
        anomalies: [], 
        classifications: [],
        status: 'error', 
        error: error.message 
      };
    }
  }
} 