import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogsService, LogType } from './logs/logs.service';
import { SeedLogsService } from './logs/seed-logs.service';
import { Logger } from '@nestjs/common';

const PORT = process.env.PORT ?? 5000;
const logger = new Logger('Bootstrap');

// 配置 CORS
const allowedOrigins = [
  process.env.FRONT_URL || 'http://localhost:5173', // 默认本地前端地址
];
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 获取日志服务并记录系统启动
  const logsService = app.get(LogsService);
  
  // 确保日志数据已经初始化
  try {
    const seedLogsService = app.get(SeedLogsService);
    logger.log('正在初始化日志数据...');
    await seedLogsService.initSeedData();
    logger.log('日志数据初始化完成');
  } catch (error) {
    logger.error(`日志数据初始化失败: ${error.message}`, error.stack);
  }
  
  await logsService.logSystemStart(`系统启动成功，监听端口: ${PORT}`);
  
  // 设置全局异常捕获
  process.on('unhandledRejection', (reason, promise) => {
    logsService.logError('system', '未处理的Promise拒绝', reason instanceof Error ? reason : new Error(String(reason)));
  });
  
  process.on('uncaughtException', (error) => {
    logsService.logError('system', '未捕获的异常', error);
  });
  
  // 处理进程退出，记录系统关闭日志
  const gracefulShutdown = async () => {
    await logsService.logSystemStop('系统正常关闭');
    process.exit(0);
  };
  
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  app.enableCors({
    origin: (requestOrigin, callback) => {
      // 如果没有 Origin 头（如非浏览器请求），允许
      if (!requestOrigin) return callback(null, true);
      // 检查是否在允许的来源列表中
      const isAllowed = allowedOrigins.includes(requestOrigin);
      if (isAllowed) {
        callback(null, requestOrigin); // 返回匹配的 Origin
        console.log('Allowed origin:', requestOrigin);
      } else {
        console.log('Blocked origin:', requestOrigin);
        logsService.logWarning('cors', `CORS拒绝来源: ${requestOrigin}`);
        callback(new Error('Not allowed by CORS')); // 拒绝未授权来源
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true, // 支持凭证
  });
  logger.log(`服务器启动于端口: ${PORT}, 前端URL: ${process.env.FRONT_URL || 'http://localhost:5173'}`);
  await app.listen(PORT);
}
bootstrap();
