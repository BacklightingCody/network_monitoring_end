import { Controller, Get, Query, Param, ParseIntPipe, HttpException, HttpStatus } from '@nestjs/common';
import { TrafficService } from './traffic.service';

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
      return await this.trafficService.getPackets({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sourceIp,
        destinationIp,
        protocol,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      });
    } catch (error) {
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

  private getTimeRange(startTime?: string, endTime?: string) {
    if (!startTime && !endTime) return undefined;
    
    const timeRange: any = {};
    if (startTime) timeRange.start = new Date(startTime);
    if (endTime) timeRange.end = new Date(endTime);
    return timeRange;
  }
}