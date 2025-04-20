import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevicesModule } from '@/devices/devices.module';
import { TrafficModule } from '@/traffic/traffic.module';
import { LogsModule } from '@/logs/logs.module';
import { PerformanceInterceptor } from '@/common/interceptors/performance.interceptor';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { ValidationPipe } from '@/common/pipes/validation.pipe';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { MetricsModule } from '@/metrics/metrics.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { CaptureModule } from '@/capture/capture.module';
import { AnalysisModule } from '@/analysis/analysis.module';

const envFiles = ['.env'];
export const IS_DEV = process.env.RUNNING_ENV !== 'prod';
if (IS_DEV) {
  envFiles.unshift('.env.dev');
}
// else {
//   envFiles.unshift('.env.prod');
// }

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: envFiles, // 使用动态选择的环境文件
      isGlobal: true, // 使 ConfigService 全局可用
      load: [() => ({ // 可选：自定义加载逻辑
        PORT: process.env.PORT ?? 5000,
        FRONT_URL: process.env.FRONT_URL || 'http://localhost:5173',
      })],
    }),
    DevicesModule,  // 引入 Devices 模块
    TrafficModule,  // 引入 Traffic 模块
    LogsModule,     // 引入 Logs 模块
    MetricsModule,  // 引入 Metrics 模块
    PrismaModule,   // 引入 Prisma 模块
    CaptureModule,  // 引入 Capture 模块
    AnalysisModule, // 引入 Analysis 模块
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
export class AppModule { }
