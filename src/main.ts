import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const PORT = process.env.PORT ?? 5000;

// 配置 CORS
const allowedOrigins = [
  process.env.FRONT_URL || 'http://localhost:5173', // 默认本地前端地址
];
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
        callback(new Error('Not allowed by CORS')); // 拒绝未授权来源
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true, // 支持凭证
  });
  console.log('Port:', PORT, 'Frontend URL:', process.env.FRONT_URL);
  await app.listen(PORT);
}
bootstrap();
