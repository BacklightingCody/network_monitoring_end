import { Module } from '@nestjs/common';
import { DevicesModule } from '@/devices/devices.module';
import { TrafficModule } from '@/traffic/traffic.module';
import { LogsModule } from '@/logs/logs.module';
import { PerformanceInterceptor } from '@/common/interceptors/performance.interceptor';
import {AllExceptionsFilter} from '@/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { ValidationPipe } from '@/common/pipes/validation.pipe';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { MetricsModule } from '@/metrics/metrics.module';

@Module({
  imports: [
    DevicesModule,  // 引入 Devices 模块
    TrafficModule,  // 引入 Traffic 模块
    LogsModule,   // 引入 Logs 模块
    MetricsModule,   // 引入 Metrics 模块
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor, // 注册全局拦截器
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter, // 注册http过滤器
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe, // 注册全局管道
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter, // 注册全局过滤器
    },
    {
      provide: APP_INTERCEPTOR, //响应拦截器
      useClass: ResponseInterceptor
    }
  ],
})
export class AppModule {}
