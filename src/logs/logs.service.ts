import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export enum LogType {
  SYSTEM_START = 'SYSTEM_START',
  SYSTEM_STOP = 'SYSTEM_STOP', 
  API_ACCESS = 'API_ACCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export interface LogOptions {
  metadata?: any;
}

export interface LogTypeStats {
  type: string;
  count: number;
  percentage: number;
}

export interface LogSourceStats {
  source: string;
  count: number;
  percentage: number;
}

export interface LogTimeStats {
  time: string;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  apiCount: number;
  systemCount: number;
  totalCount: number;
}

interface LogCountResult {
  count: string;
}

interface LogTypeResult {
  type: string;
  count: string;
}

interface LogSourceResult {
  source: string;
  count: string;
}

interface LogTimeResult {
  time: Date;
  error_count: string | null;
  warning_count: string | null;
  info_count: string | null;
  api_count: string | null;
  system_count: string | null;
  total_count: string;
}

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async log(type: LogType, source: string, message: string, options?: LogOptions) {
    return this.prisma.$executeRaw`
      INSERT INTO "SystemLog" ("logType", "source", "message", "metadata", "timestamp", "createdAt", "updatedAt")
      VALUES (${type}, ${source}, ${message}, ${options?.metadata ? JSON.stringify(options.metadata) : null}::json, NOW(), NOW(), NOW())
    `;
  }

  async logSystemStart(message: string, options?: LogOptions) {
    return this.log(LogType.SYSTEM_START, 'system', message, options);
  }

  async logSystemStop(message: string, options?: LogOptions) {
    return this.log(LogType.SYSTEM_STOP, 'system', message, options);
  }

  async logApiAccess(endpoint: string, method: string, options?: LogOptions) {
    return this.log(
      LogType.API_ACCESS, 
      'api',
      `${method} ${endpoint}`,
      options
    );
  }

  async logError(source: string, message: string, error?: Error, options?: LogOptions) {
    const metadata = {
      ...options?.metadata,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    };
    
    return this.log(LogType.ERROR, source, message, { metadata });
  }

  async logWarning(source: string, message: string, options?: LogOptions) {
    return this.log(LogType.WARNING, source, message, options);
  }

  async logInfo(source: string, message: string, options?: LogOptions) {
    return this.log(LogType.INFO, source, message, options);
  }

  buildWhereClause(
    type?: LogType, 
    source?: string, 
    search?: string, 
    startTime?: Date, 
    endTime?: Date
  ): string {
    const conditions = [];
    
    if (type) {
      conditions.push(`"logType" = '${type}'`);
    }
    
    if (source) {
      conditions.push(`"source" = '${source}'`);
    }
    
    if (search) {
      conditions.push(`"message" ILIKE '%${search}%'`);
    }
    
    if (startTime) {
      conditions.push(`"timestamp" >= '${startTime.toISOString()}'`);
    }
    
    if (endTime) {
      conditions.push(`"timestamp" <= '${endTime.toISOString()}'`);
    }
    
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  async getAllLogs(
    limit = 100, 
    offset = 0, 
    type?: LogType, 
    source?: string, 
    search?: string, 
    startTime?: Date, 
    endTime?: Date
  ) {
    const whereClause = this.buildWhereClause(type, source, search, startTime, endTime);
    
    const query = `
      SELECT * FROM "SystemLog"
      ${whereClause}
      ORDER BY "timestamp" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    return this.prisma.$queryRaw(Prisma.raw(query));
  }

  async getLogsCount(
    type?: LogType, 
    source?: string, 
    search?: string, 
    startTime?: Date, 
    endTime?: Date
  ): Promise<number> {
    const whereClause = this.buildWhereClause(type, source, search, startTime, endTime);
    
    const query = `
      SELECT COUNT(*) as count FROM "SystemLog"
      ${whereClause}
    `;
    
    const result = await this.prisma.$queryRaw<LogCountResult[]>(Prisma.raw(query));
    return result[0]?.count ? parseInt(result[0].count) : 0;
  }

  async getLogTypeStats(startTime?: Date, endTime?: Date): Promise<LogTypeStats[]> {
    const whereClause = this.buildWhereClause(undefined, undefined, undefined, startTime, endTime);
    
    const query = `
      SELECT "logType" as type, COUNT(*) as count
      FROM "SystemLog"
      ${whereClause}
      GROUP BY "logType"
      ORDER BY count DESC
    `;
    
    const results = await this.prisma.$queryRaw<LogTypeResult[]>(Prisma.raw(query));
    
    // 计算总数和百分比
    const total = results.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    return results.map(row => ({
      type: row.type,
      count: parseInt(row.count),
      percentage: parseFloat(((parseInt(row.count) / total) * 100).toFixed(1))
    }));
  }

  async getLogSourceStats(startTime?: Date, endTime?: Date): Promise<LogSourceStats[]> {
    const whereClause = this.buildWhereClause(undefined, undefined, undefined, startTime, endTime);
    
    const query = `
      SELECT "source", COUNT(*) as count
      FROM "SystemLog"
      ${whereClause}
      GROUP BY "source"
      ORDER BY count DESC
    `;
    
    const results = await this.prisma.$queryRaw<LogSourceResult[]>(Prisma.raw(query));
    
    // 计算总数和百分比
    const total = results.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    return results.map(row => ({
      source: row.source,
      count: parseInt(row.count),
      percentage: parseFloat(((parseInt(row.count) / total) * 100).toFixed(1))
    }));
  }

  async getLogTimeStats(
    startTime?: Date, 
    endTime?: Date, 
    interval: 'hour' | 'day' | 'week' = 'hour'
  ): Promise<LogTimeStats[]> {
    let intervalQuery;
    
    switch (interval) {
      case 'hour':
        intervalQuery = `date_trunc('hour', "timestamp")`;
        break;
      case 'day':
        intervalQuery = `date_trunc('day', "timestamp")`;
        break;
      case 'week':
        intervalQuery = `date_trunc('week', "timestamp")`;
        break;
      default:
        intervalQuery = `date_trunc('hour', "timestamp")`;
    }
    
    const whereClause = this.buildWhereClause(undefined, undefined, undefined, startTime, endTime);
    
    const query = `
      SELECT 
        ${intervalQuery} as time,
        COUNT(CASE WHEN "logType" = 'ERROR' THEN 1 END) as error_count,
        COUNT(CASE WHEN "logType" = 'WARNING' THEN 1 END) as warning_count,
        COUNT(CASE WHEN "logType" = 'INFO' THEN 1 END) as info_count,
        COUNT(CASE WHEN "source" = 'api' THEN 1 END) as api_count,
        COUNT(CASE WHEN "source" = 'system' THEN 1 END) as system_count,
        COUNT(*) as total_count
      FROM "SystemLog"
      ${whereClause}
      GROUP BY time
      ORDER BY time ASC
    `;
    
    const results = await this.prisma.$queryRaw<LogTimeResult[]>(Prisma.raw(query));
    
    return results.map(row => ({
      time: row.time.toISOString(),
      errorCount: parseInt(row.error_count || '0'),
      warningCount: parseInt(row.warning_count || '0'),
      infoCount: parseInt(row.info_count || '0'),
      apiCount: parseInt(row.api_count || '0'),
      systemCount: parseInt(row.system_count || '0'),
      totalCount: parseInt(row.total_count)
    }));
  }

  async clearLogs() {
    return this.prisma.$executeRaw`DELETE FROM "SystemLog"`;
  }
}
