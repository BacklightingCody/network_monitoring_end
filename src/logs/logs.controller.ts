import { Controller, Get, Post, Body, Query, Delete, Param, Res, HttpStatus, ParseEnumPipe } from '@nestjs/common';
import { LogsService, LogType } from './logs.service';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { SeedLogsService } from './seed-logs.service';

// 创建日志DTO
class CreateLogDto {
  logType: LogType;
  source: string;
  message: string;
  metadata?: any;
}

@Controller('logs')
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly seedLogsService: SeedLogsService
  ) {}

  @Get()
  async getLogs(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('type', new ParseEnumPipe(LogType, { optional: true })) type?: LogType,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const logs = await this.logsService.getAllLogs(
      limit || 50, 
      offset || 0, 
      type, 
      source,
      search,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined
    );
    
    const count = await this.logsService.getLogsCount(
      type, 
      source,
      search,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined
    );
    
    return {
      code: 0,
      data: logs,
      total: count,
      message: "成功"
    };
  }

  @Get('mock')
  getMockLogs() {
    try {
      const mockDataPath = path.join(__dirname, 'mock-logs.json');
      const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
      return {
        code: 0,
        data: mockData.logs,
        total: mockData.logs.length,
        message: "成功"
      };
    } catch (error) {
      return {
        code: 500,
        message: "读取模拟数据失败",
        error: error.message
      };
    }
  }

  @Get('type-stats')
  async getTypeStats(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const stats = await this.logsService.getLogTypeStats(
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined
      );
      
      return {
        code: 0,
        data: stats,
        message: "成功"
      };
    } catch (error) {
      // 使用模拟数据
      try {
        const mockDataPath = path.join(__dirname, 'mock-logs.json');
        const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
        return {
          code: 0,
          data: mockData.typeStats,
          message: "成功(模拟数据)"
        };
      } catch (mockError) {
        return {
          code: 500,
          message: "获取日志类型统计失败",
          error: error.message
        };
      }
    }
  }

  @Get('source-stats')
  async getSourceStats(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const stats = await this.logsService.getLogSourceStats(
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined
      );
      
      return {
        code: 0,
        data: stats,
        message: "成功"
      };
    } catch (error) {
      // 使用模拟数据
      try {
        const mockDataPath = path.join(__dirname, 'mock-logs.json');
        const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
        return {
          code: 0,
          data: mockData.sourceStats,
          message: "成功(模拟数据)"
        };
      } catch (mockError) {
        return {
          code: 500,
          message: "获取日志来源统计失败",
          error: error.message
        };
      }
    }
  }

  @Get('time-stats')
  async getTimeStats(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('interval') interval?: 'hour' | 'day' | 'week',
  ) {
    try {
      const stats = await this.logsService.getLogTimeStats(
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined,
        interval || 'hour'
      );
      
      return {
        code: 0,
        data: stats,
        message: "成功"
      };
    } catch (error) {
      // 使用模拟数据
      try {
        const mockDataPath = path.join(__dirname, 'mock-logs.json');
        const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
        return {
          code: 0,
          data: mockData.timeStats,
          message: "成功(模拟数据)"
        };
      } catch (mockError) {
        return {
          code: 500,
          message: "获取日志时间统计失败",
          error: error.message
        };
      }
    }
  }
  
  @Get('export/:format')
  async exportLogs(
    @Res() res: Response,
    @Param('format') format: string,
    @Query('type', new ParseEnumPipe(LogType, { optional: true })) type?: LogType,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const logs = await this.logsService.getAllLogs(
        1000, // 导出限制为1000条
        0,
        type, 
        source,
        search,
        startTime ? new Date(startTime) : undefined,
        endTime ? new Date(endTime) : undefined
      );
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=logs_export_${new Date().toISOString()}.json`);
        return res.send(JSON.stringify(logs, null, 2));
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=logs_export_${new Date().toISOString()}.csv`);
        
        // 创建CSV头
        let csv = 'ID,时间戳,日志类型,来源,消息,元数据,创建时间,更新时间\n';
        
        // 添加记录
        const logArray = logs as any[];
        logArray.forEach(log => {
          csv += `${log.id},${log.timestamp},${log.logType},${log.source},"${log.message.replace(/"/g, '""')}",`;
          csv += `"${log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : ''}",`;
          csv += `${log.createdAt},${log.updatedAt}\n`;
        });
        
        return res.send(csv);
      } else {
        return res.status(HttpStatus.BAD_REQUEST).send({
          code: 400,
          message: '不支持的导出格式。支持的格式：json, csv'
        });
      }
    } catch (error) {
      // 使用模拟数据
      try {
        const mockDataPath = path.join(__dirname, 'mock-logs.json');
        const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
        const logs = [...mockData.logs, ...mockData.extendedLogs];
        
        if (format === 'json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename=logs_export_${new Date().toISOString()}.json`);
          return res.send(JSON.stringify(logs, null, 2));
        } else if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename=logs_export_${new Date().toISOString()}.csv`);
          
          // 创建CSV头
          let csv = 'ID,时间戳,日志类型,来源,消息,元数据,创建时间,更新时间\n';
          
          // 添加记录
          logs.forEach(log => {
            csv += `${log.id},${log.timestamp},${log.logType},${log.source},"${log.message.replace(/"/g, '""')}",`;
            csv += `"${log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : ''}",`;
            csv += `${log.createdAt},${log.updatedAt}\n`;
          });
          
          return res.send(csv);
        } else {
          return res.status(HttpStatus.BAD_REQUEST).send({
            code: 400,
            message: '不支持的导出格式。支持的格式：json, csv'
          });
        }
      } catch (mockError) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          code: 500,
          message: "导出日志失败",
          error: error.message
        });
      }
    }
  }

  @Delete()
  async clearLogs() {
    try {
      await this.logsService.clearLogs();
      return {
        code: 0,
        data: null,
        message: "日志清除成功"
      };
    } catch (error) {
      return {
        code: 500,
        message: "清除日志失败",
        error: error.message
      };
    }
  }

  @Post()
  async createLog(@Body() createLogDto: CreateLogDto) {
    try {
      const { logType, source, message, metadata } = createLogDto;
      await this.logsService.log(logType, source, message, { metadata });
      
      return {
        code: 0,
        data: {
          timestamp: new Date(),
          logType,
          source,
          message,
          metadata
        },
        message: "日志创建成功"
      };
    } catch (error) {
      return {
        code: 500,
        message: "创建日志失败",
        error: error.message
      };
    }
  }

  @Post('reseed')
  async regenerateLogs(@Query('count') count = '500') {
    try {
      // 清空现有日志
      await this.logsService.clearLogs();
      
      // 生成新日志
      await this.seedLogsService.generateLogs(parseInt(count));
      
      return {
        code: 0,
        message: `成功重新生成 ${count} 条模拟日志数据`
      };
    } catch (error) {
      return {
        code: 500,
        message: '重新生成日志数据失败',
        error: error.message
      };
    }
  }
}
