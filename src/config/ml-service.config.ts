import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MlServiceConfig {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
    this.timeout = this.configService.get<number>('ML_SERVICE_TIMEOUT') || 30000;
    this.retryAttempts = this.configService.get<number>('ML_SERVICE_RETRY_ATTEMPTS') || 3;
    this.retryDelay = this.configService.get<number>('ML_SERVICE_RETRY_DELAY') || 1000;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getTimeout(): number {
    return this.timeout;
  }

  getRetryAttempts(): number {
    return this.retryAttempts;
  }

  getRetryDelay(): number {
    return this.retryDelay;
  }

  getAnomalyEndpoint(): string {
    return `${this.baseUrl}/api/predict/anomaly`;
  }

  getAttackEndpoint(): string {
    return `${this.baseUrl}/api/predict/attack`;
  }

  getFeatureExtractionEndpoint(): string {
    return `${this.baseUrl}/api/feature/extract`;
  }

  getBatchPredictionEndpoint(): string {
    return `${this.baseUrl}/api/predict/batch`;
  }

  getModelInfoEndpoint(): string {
    return `${this.baseUrl}/api/model/info`;
  }

  getHealthEndpoint(): string {
    return `${this.baseUrl}/api/health`;
  }

  getModelUpdateEndpoint(): string {
    return `${this.baseUrl}/api/model/update`;
  }
} 