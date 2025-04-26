import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogType } from './logs.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SeedLogsService implements OnModuleInit {
  private readonly logger = new Logger('SeedLogsService');
  
  constructor(private prisma: PrismaService) {}
  
  async onModuleInit() {
    try {
      await this.initSeedData();
    } catch (error) {
      this.logger.error(`生成日志模拟数据失败: ${error.message}`, error.stack);
    }
  }

  async initSeedData() {
    try {
      this.logger.log('正在检查日志数据...');
      const count = await this.getLogCount();
      
      this.logger.log(`数据库中有 ${count} 条日志记录`);
      
      if (count === 0) {
        this.logger.log('数据库中无日志数据，开始生成模拟数据...');
        await this.generateLogs(500);
        this.logger.log('日志模拟数据生成完成');
      } else {
        this.logger.log(`数据库中已有 ${count} 条日志记录，跳过模拟数据生成`);
      }
      return { success: true, count };
    } catch (error) {
      this.logger.error(`初始化日志数据失败: ${error.message}`);
      if (error.message.includes('relation') || error.message.includes('table') || error.message.includes('does not exist')) {
        this.logger.warn('可能是数据库表结构未创建，请执行 npx prisma migrate dev');
      }
      throw error;
    }
  }
  
  /**
   * 获取当前数据库中的日志数量
   */
  async getLogCount(): Promise<number> {
    try {
      // 使用更安全的查询方式
      const result = await this.prisma.$queryRaw<[{count: string}]>(
        Prisma.raw('SELECT COUNT(*) as count FROM "SystemLog"')
      );
      return result && result[0] && result[0].count ? parseInt(result[0].count) : 0;
    } catch (error) {
      this.logger.error(`获取日志数量失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 生成指定数量的模拟日志数据
   */
  async generateLogs(count: number) {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    
    // 日志类型
    const logTypes = Object.values(LogType);
    
    // 日志来源
    const sources = [
      'system', 'api', 'database', 'network', 'monitoring', 
      'capture', 'scheduler', 'analysis', 'auth', 'frontend'
    ];
    
    // API路径
    const apiPaths = [
      '/devices', '/traffic', '/logs', '/metrics', '/analysis', 
      '/topology', '/capture', '/users', '/auth/login', '/dashboard'
    ];
    
    // API方法
    const apiMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    
    // IP地址范围
    const generateIP = () => {
      return `192.168.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    };
    
    // 用户代理
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      'PostmanRuntime/7.29.0',
      'curl/7.64.1',
      'Python-requests/2.28.1',
      'node-fetch/1.0'
    ];
    
    // 错误类型
    const errors = [
      {name: '数据库查询超时', source: 'database'},
      {name: '数据包捕获失败', source: 'capture'},
      {name: '数据包解析错误', source: 'capture'},
      {name: '认证失败', source: 'auth'},
      {name: '连接拒绝', source: 'network'},
      {name: 'API调用失败', source: 'api'},
      {name: '文件不存在', source: 'system'},
      {name: '权限不足', source: 'system'},
      {name: '内存不足', source: 'system'},
      {name: '无效参数', source: 'api'},
      {name: '配置错误', source: 'config'},
      {name: '解析异常', source: 'analysis'}
    ];
    
    // 警告类型
    const warnings = [
      {name: 'CPU使用率超过阈值', source: 'monitoring'},
      {name: '内存使用率超过阈值', source: 'monitoring'},
      {name: '磁盘空间不足', source: 'system'},
      {name: '网络延迟超过阈值', source: 'network'},
      {name: '高流量检测', source: 'network'},
      {name: 'API响应时间过长', source: 'api'},
      {name: '会话超时', source: 'auth'},
      {name: '重复登录尝试', source: 'auth'},
      {name: '数据库连接池接近上限', source: 'database'},
      {name: '缓存命中率低', source: 'system'}
    ];
    
    // 信息类型
    const infoMessages = [
      {name: '系统启动成功', source: 'system'},
      {name: '数据库连接建立成功', source: 'database'},
      {name: '定时任务启动', source: 'scheduler'},
      {name: '备份任务完成', source: 'scheduler'},
      {name: '用户登录成功', source: 'auth'},
      {name: '配置文件加载完成', source: 'system'},
      {name: '服务状态检查', source: 'system'},
      {name: '捕获会话开始', source: 'capture'},
      {name: '设备状态更新', source: 'devices'},
      {name: '系统资源使用情况报告', source: 'monitoring'}
    ];
    
    // 生成随机时间戳
    const generateTimestamp = () => {
      const start = threeDaysAgo.getTime();
      const end = now.getTime();
      return new Date(start + Math.random() * (end - start));
    };
    
    // 生成API访问日志
    const generateApiAccessLog = () => {
      const method = apiMethods[Math.floor(Math.random() * apiMethods.length)];
      const path = apiPaths[Math.floor(Math.random() * apiPaths.length)];
      const ip = generateIP();
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      const duration = Math.floor(Math.random() * 500) + 5; // 5-505ms
      
      return {
        logType: LogType.API_ACCESS,
        source: 'api',
        message: `${method} ${path}`,
        metadata: {
          ip,
          userAgent,
          duration,
          timestamp: new Date().toISOString()
        }
      };
    };
    
    // 生成错误日志
    const generateErrorLog = () => {
      const error = errors[Math.floor(Math.random() * errors.length)];
      return {
        logType: LogType.ERROR,
        source: error.source,
        message: error.name,
        metadata: {
          timestamp: new Date().toISOString(),
          errorCode: `ERR_${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          details: `模拟错误详情信息-${Math.floor(Math.random() * 1000)}`
        }
      };
    };
    
    // 生成警告日志
    const generateWarningLog = () => {
      const warning = warnings[Math.floor(Math.random() * warnings.length)];
      return {
        logType: LogType.WARNING,
        source: warning.source,
        message: warning.name,
        metadata: {
          timestamp: new Date().toISOString(),
          threshold: Math.floor(Math.random() * 90) + 10,
          current: Math.floor(Math.random() * 50) + 80,
          duration: `${Math.floor(Math.random() * 30) + 1}分钟`
        }
      };
    };
    
    // 生成信息日志
    const generateInfoLog = () => {
      const info = infoMessages[Math.floor(Math.random() * infoMessages.length)];
      return {
        logType: LogType.INFO,
        source: info.source,
        message: info.name,
        metadata: {
          timestamp: new Date().toISOString(),
          details: `模拟信息详情-${Math.floor(Math.random() * 1000)}`
        }
      };
    };
    
    // 生成系统启动日志
    const generateSystemStartLog = () => {
      return {
        logType: LogType.SYSTEM_START,
        source: 'system',
        message: '系统启动成功',
        metadata: {
          timestamp: new Date().toISOString(),
          port: 5000,
          environment: process.env.NODE_ENV || 'development'
        }
      };
    };
    
    // 生成系统关闭日志
    const generateSystemStopLog = () => {
      return {
        logType: LogType.SYSTEM_STOP,
        source: 'system',
        message: '系统正常关闭',
        metadata: {
          timestamp: new Date().toISOString(),
          uptime: `${Math.floor(Math.random() * 24)}h${Math.floor(Math.random() * 60)}m`,
          reason: '管理员请求'
        }
      };
    };
    
    // 生成随机日志
    const generateRandomLog = () => {
      const rand = Math.random();
      if (rand < 0.35) {
        return generateApiAccessLog();
      } else if (rand < 0.50) {
        return generateErrorLog();
      } else if (rand < 0.65) {
        return generateWarningLog();
      } else {
        return generateInfoLog();
      }
    };
    
    // 准备日志数据
    const logs = [];
    
    // 添加系统启动和关闭日志
    logs.push({
      ...generateSystemStartLog(),
      timestamp: threeDaysAgo,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo
    });
    
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);
    
    logs.push({
      ...generateSystemStartLog(),
      timestamp: twoDaysAgo,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo
    });
    
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);
    
    logs.push({
      ...generateSystemStartLog(),
      timestamp: oneDayAgo,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo
    });
    
    // 生成今天的启动日志
    logs.push({
      ...generateSystemStartLog(),
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 前三天的系统关闭日志
    const threeDaysAgoClose = new Date(threeDaysAgo);
    threeDaysAgoClose.setHours(threeDaysAgoClose.getHours() + 10);
    logs.push({
      ...generateSystemStopLog(),
      timestamp: threeDaysAgoClose,
      createdAt: threeDaysAgoClose,
      updatedAt: threeDaysAgoClose
    });
    
    const twoDaysAgoClose = new Date(twoDaysAgo);
    twoDaysAgoClose.setHours(twoDaysAgoClose.getHours() + 8);
    logs.push({
      ...generateSystemStopLog(),
      timestamp: twoDaysAgoClose,
      createdAt: twoDaysAgoClose,
      updatedAt: twoDaysAgoClose
    });
    
    const oneDayAgoClose = new Date(oneDayAgo);
    oneDayAgoClose.setHours(oneDayAgoClose.getHours() + 12);
    logs.push({
      ...generateSystemStopLog(),
      timestamp: oneDayAgoClose,
      createdAt: oneDayAgoClose,
      updatedAt: oneDayAgoClose
    });
    
    // 生成剩余随机日志
    for (let i = 0; i < count - logs.length; i++) {
      const timestamp = generateTimestamp();
      const log = generateRandomLog();
      logs.push({
        ...log,
        timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    
    // 批量插入日志
    const batchSize = 50;
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      
      // 构建批量插入SQL
      let query = 'INSERT INTO "SystemLog" ("timestamp", "logType", "source", "message", "metadata", "createdAt", "updatedAt") VALUES ';
      
      const values = batch.map((log, index) => {
        const params = [
          log.timestamp.toISOString(),
          log.logType,
          log.source,
          log.message,
          JSON.stringify(log.metadata),
          log.createdAt.toISOString(),
          log.updatedAt.toISOString()
        ];
        
        return `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}::json, $${index * 7 + 6}, $${index * 7 + 7})`;
      }).join(', ');
      
      query += values;
      
      // 扁平化参数数组
      const flatParams = batch.flatMap(log => [
        log.timestamp.toISOString(),
        log.logType,
        log.source,
        log.message,
        JSON.stringify(log.metadata),
        log.createdAt.toISOString(),
        log.updatedAt.toISOString()
      ]);
      
      await this.prisma.$executeRaw(Prisma.raw(query), ...flatParams);
      
      this.logger.debug(`已插入 ${i + batch.length}/${logs.length} 条日志记录`);
    }
  }
} 