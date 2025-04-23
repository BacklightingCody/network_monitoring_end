import { Controller, Get, Query, Param, ParseIntPipe, HttpException, HttpStatus } from '@nestjs/common';
import { TrafficService } from './traffic.service';
import { RealtimeTrafficData, TrafficTrendData } from './traffic.types';

@Controller('traffic')
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  @Get('packets')
  async getPackets(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('sourceIp') sourceIp?: string,
    @Query('destinationIp') destinationIp?: string,
    @Query('protocol') protocol?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      console.log('接收到请求参数:', {
        page, limit, sourceIp, destinationIp, protocol, startTime, endTime
      });
      
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      
      if (isNaN(pageNum) || isNaN(limitNum)) {
        throw new HttpException(
          `无效的页码或限制参数: page=${page}, limit=${limit}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      
      let startDate, endDate;
      try {
        if (startTime) startDate = new Date(startTime);
        if (endTime) endDate = new Date(endTime);
        
        // 验证日期是否有效
        if (startTime && startDate.toString() === 'Invalid Date') {
          throw new Error(`无效的开始时间格式: ${startTime}`);
        }
        if (endTime && endDate.toString() === 'Invalid Date') {
          throw new Error(`无效的结束时间格式: ${endTime}`);
        }
      } catch (dateError) {
        console.error('日期转换错误:', dateError);
        throw new HttpException(
          `日期格式错误: ${dateError.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      
      console.log('处理后的参数:', {
        page: pageNum, 
        limit: limitNum, 
        startTime: startDate, 
        endTime: endDate
      });
      
      return await this.trafficService.getPackets({
        page: pageNum,
        limit: limitNum,
        sourceIp,
        destinationIp,
        protocol,
        startTime: startDate,
        endTime: endDate,
      });
    } catch (error) {
      console.error('获取流量数据失败:', error);
      if (error instanceof HttpException) {
        throw error; // 重新抛出HTTP异常
      }
      throw new HttpException(
        `获取流量数据失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getTrafficStats(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('interval') interval: string = '5m',
  ) {
    try {
      let timeRange;
      if (startTime && endTime) {
        timeRange = {
          start: new Date(startTime),
          end: new Date(endTime),
        };
      }
      
      return await this.trafficService.getTrafficStats(timeRange, interval);
    } catch (error) {
      throw new HttpException(
        `获取流量统计失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('anomalies')
  async getAnomalies(
    @Query('limit') limit: string = '20',
    @Query('severity') severity?: string,
    @Query('type') type?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const filter: any = {};
      
      if (severity) {
        filter.severity = severity;
      }
      
      if (type) {
        filter.type = type;
      }
      
      if (startTime || endTime) {
        filter.timestamp = {};
        if (startTime) filter.timestamp.gte = new Date(startTime);
        if (endTime) filter.timestamp.lte = new Date(endTime);
      }
      
      return await this.trafficService.getAnomalies(parseInt(limit, 10), filter);
    } catch (error) {
      throw new HttpException(
        `获取异常记录失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('top-sources')
  async getTopSources(
    @Query('limit') limit: string = '10',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getTopSources(parseInt(limit, 10), timeRange);
    } catch (error) {
      throw new HttpException(
        `获取流量来源统计失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('top-destinations')
  async getTopDestinations(
    @Query('limit') limit: string = '10',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getTopDestinations(parseInt(limit, 10), timeRange);
    } catch (error) {
      throw new HttpException(
        `获取流量目标统计失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('protocols')
  async getProtocolStats(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getProtocolStats(timeRange);
    } catch (error) {
      throw new HttpException(
        `获取协议统计失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('traffic-volume')
  async getTrafficVolume(
    @Query('interval') interval: string = '5m',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getTrafficVolume(interval, timeRange);
    } catch (error) {
      throw new HttpException(
        `获取流量体积统计失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analyze/:id')
  async analyzePacket(
    @Param('id', ParseIntPipe) packetId: number,
  ) {
    try {
      return await this.trafficService.analyzePacket(packetId);
    } catch (error) {
      throw new HttpException(
        `分析数据包失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 新增接口：获取活跃连接
  @Get('active-connections')
  async getActiveConnections(
    @Query('limit') limit: string = '20',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      // 检查服务方法是否存在
      if (typeof this.trafficService.getActiveConnections !== 'function') {
        throw new HttpException(
          '服务方法未实现',
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getActiveConnections(parseInt(limit, 10), timeRange);
    } catch (error) {
      console.error('获取活跃连接失败:', error);
      throw new HttpException(
        `获取活跃连接失败: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 新增接口：获取端口使用情况
  @Get('port-usage')
  async getPortUsage(
    @Query('limit') limit: string = '20',
    @Query('direction') direction: string = 'both', // 'source', 'destination', 'both'
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      // 检查服务方法是否存在
      if (typeof this.trafficService.getPortUsage !== 'function') {
        throw new HttpException(
          '服务方法未实现',
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getPortUsage(parseInt(limit, 10), direction, timeRange);
    } catch (error) {
      console.error('获取端口使用情况失败:', error);
      throw new HttpException(
        `获取端口使用情况失败: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 新增接口：获取流量趋势
  @Get('traffic-trend')
  async getTrafficTrend(
    @Query('interval') interval: string = 'hourly', // 'hourly', 'daily', 'weekly'
    @Query('metric') metric: string = 'packets', // 'packets', 'bytes'
    @Query('days') days: string = '7',
  ): Promise<TrafficTrendData> {
    try {
      // 检查服务方法是否存在
      if (typeof this.trafficService.getTrafficTrend !== 'function') {
        throw new HttpException(
          '服务方法未实现',
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      return await this.trafficService.getTrafficTrend(
        interval,
        metric,
        parseInt(days, 10)
      );
    } catch (error) {
      console.error('获取流量趋势失败:', error);
      throw new HttpException(
        `获取流量趋势失败: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 新增接口：获取流量地理分布
  @Get('geo-distribution')
  async getGeoDistribution(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      // 检查服务方法是否存在
      if (typeof this.trafficService.getGeoDistribution !== 'function') {
        throw new HttpException(
          '服务方法未实现',
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getGeoDistribution(timeRange);
    } catch (error) {
      console.error('获取地理分布失败:', error);
      throw new HttpException(
        `获取地理分布失败: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 新增接口：获取通信对统计
  @Get('communication-pairs')
  async getCommunicationPairs(
    @Query('limit') limit: string = '20',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      // 检查服务方法是否存在
      if (typeof this.trafficService.getCommunicationPairs !== 'function') {
        throw new HttpException(
          '服务方法未实现',
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getCommunicationPairs(parseInt(limit, 10), timeRange);
    } catch (error) {
      console.error('获取通信对统计失败:', error);
      throw new HttpException(
        `获取通信对统计失败: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 新增接口：获取数据包大小分布
  @Get('packet-size-distribution')
  async getPacketSizeDistribution(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      // 检查服务方法是否存在
      if (typeof this.trafficService.getPacketSizeDistribution !== 'function') {
        throw new HttpException(
          '服务方法未实现',
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getPacketSizeDistribution(timeRange);
    } catch (error) {
      console.error('获取数据包大小分布失败:', error);
      throw new HttpException(
        `获取数据包大小分布失败: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 新增接口：获取实时流量监控数据
  @Get('realtime')
  async getRealtimeTraffic(): Promise<RealtimeTrafficData> {
    try {
      // 检查服务方法是否存在
      if (typeof this.trafficService.getRealtimeTraffic !== 'function') {
        throw new HttpException(
          '服务方法未实现',
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      return await this.trafficService.getRealtimeTraffic();
    } catch (error) {
      console.error('获取实时流量数据失败:', error);
      throw new HttpException(
        `获取实时流量数据失败: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 新增接口：获取网络应用使用情况
  @Get('applications')
  async getApplicationUsage(
    @Query('limit') limit: string = '10',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    try {
      // 检查服务方法是否存在
      if (typeof this.trafficService.getApplicationUsage !== 'function') {
        throw new HttpException(
          '服务方法未实现',
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      const timeRange = this.getTimeRange(startTime, endTime);
      return await this.trafficService.getApplicationUsage(parseInt(limit, 10), timeRange);
    } catch (error) {
      console.error('获取应用使用情况失败:', error);
      throw new HttpException(
        `获取应用使用情况失败: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getTimeRange(startTime?: string, endTime?: string) {
    if (!startTime && !endTime) return undefined;
    
    const timeRange: any = {};
    if (startTime) timeRange.start = new Date(startTime);
    if (endTime) timeRange.end = new Date(endTime);
    return timeRange;
  }

  @Get('all')
  async getAllTrafficMetrics(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('interval') interval: string = '5m',
    @Query('limit') limit: string = '10',
    @Query('includeRealtime') includeRealtime: string = 'true',
    @Query('includeTrafficTrend') includeTrafficTrend: string = 'true',
    @Query('includePackets') includePackets: string = 'false',
    @Query('days') days: string = '7',
  ) {
    try {
      // 转换参数
      const timeRange = this.getTimeRange(startTime, endTime);
      const limitNum = parseInt(limit, 10);
      const daysNum = parseInt(days, 10);
      
      // 布尔值转换
      const includeRealtimeFlag = includeRealtime?.toLowerCase() === 'true';
      const includeTrafficTrendFlag = includeTrafficTrend?.toLowerCase() === 'true';
      const includePacketsFlag = includePackets?.toLowerCase() === 'true';
      
      return await this.trafficService.getAllTrafficMetrics({
        timeRange,
        interval,
        limit: limitNum,
        includeRealtime: includeRealtimeFlag,
        includeTrafficTrend: includeTrafficTrendFlag,
        includePackets: includePacketsFlag,
        days: daysNum
      });
    } catch (error) {
      console.error('获取全部流量统计数据失败:', error);
      throw new HttpException(
        `获取全部流量统计数据失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}