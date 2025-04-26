import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LogsService } from './logs.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly logsService: LogsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, body } = req;
    
    // 记录请求开始
    this.logsService.logApiAccess(originalUrl, method, {
      metadata: {
        ip,
        userAgent: req.headers['user-agent'],
        body: method !== 'GET' ? body : undefined,
      },
    });

    // 获取响应时间
    const start = Date.now();
    
    // 响应结束时的回调
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;

      // 记录异常状态码
      if (statusCode >= 400) {
        this.logsService.logWarning('api', `API请求失败 ${method} ${originalUrl}`, {
          metadata: {
            statusCode,
            duration,
            ip,
          },
        });
      }
    });

    next();
  }
} 