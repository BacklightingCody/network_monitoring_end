import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as tf from '@tensorflow/tfjs';
import { AnalysisService } from '../analysis/analysis.service';

@Injectable()
export class TrafficService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: AnalysisService
  ) {}

  // 获取数据包列表（分页）
  async getPackets(params: {
    page: number;
    limit: number;
    sourceIp?: string;
    destinationIp?: string;
    protocol?: string;
    startTime?: Date;
    endTime?: Date;
  }) {
    const { page, limit, sourceIp, destinationIp, protocol, startTime, endTime } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (sourceIp) where.sourceIp = sourceIp;
    if (destinationIp) where.destinationIp = destinationIp;
    if (protocol) where.protocol = protocol;
    
    // 添加时间范围过滤
    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) where.timestamp.gte = startTime;
      if (endTime) where.timestamp.lte = endTime;
    }

    // 查询数据
    const [total, packets] = await Promise.all([
      this.prisma.packet.count({ where }),
      this.prisma.packet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      packets,
    };
  }

  // 获取流量统计数据
  async getTrafficStats(timeRange?: { start?: Date; end?: Date }, interval: string = '5m') {
    // 根据时间范围获取数据包
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 10000, // 限制最大返回数量
    });

    // 计算基本统计信息
    const stats = this.calculateStats(packets);
    
    // 如果指定了时间间隔，则按时间分组
    if (interval && packets.length > 0) {
      const timeSeriesData = this.generateTimeSeriesData(packets, interval);
      return {
        ...stats,
        timeSeries: timeSeriesData,
      };
    }

    return stats;
  }

  // 获取异常记录列表
  async getAnomalies(limit: number = 20, filter: any = {}) {
    return this.prisma.anomaly.findMany({
      where: filter,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        packet: true,
      },
    });
  }

  // 获取最常见的源IP地址
  async getTopSources(limit: number = 10, timeRange?: { start?: Date; end?: Date }) {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: { sourceIp: true },
      take: 5000,
    });

    // 统计IP出现次数
    const ipCounts: Record<string, number> = {};
    for (const packet of packets) {
      ipCounts[packet.sourceIp] = (ipCounts[packet.sourceIp] || 0) + 1;
    }

    // 排序并限制结果数量
    const topSources = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count: count as number }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, limit);

    return topSources;
  }

  // 获取最常见的目标IP地址
  async getTopDestinations(limit: number = 10, timeRange?: { start?: Date; end?: Date }) {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: { destinationIp: true },
      take: 5000,
    });

    // 统计IP出现次数
    const ipCounts: Record<string, number> = {};
    for (const packet of packets) {
      ipCounts[packet.destinationIp] = (ipCounts[packet.destinationIp] || 0) + 1;
    }

    // 排序并限制结果数量
    const topDestinations = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count: count as number }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, limit);

    return topDestinations;
  }

  // 获取协议统计
  async getProtocolStats(timeRange?: { start?: Date; end?: Date }) {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: { protocol: true },
      take: 10000,
    });

    // 统计协议出现次数
    const protocolCounts: Record<string, number> = {};
    for (const packet of packets) {
      protocolCounts[packet.protocol] = (protocolCounts[packet.protocol] || 0) + 1;
    }

    // 转换为数组格式
    const stats = Object.entries(protocolCounts).map(([protocol, count]) => ({
      protocol,
      count: count as number,
      percentage: (count as number) / packets.length * 100,
    }));

    return {
      total: packets.length,
      stats: stats.sort((a, b) => (b.count as number) - (a.count as number)),
    };
  }

  // 获取流量体积统计（按时间间隔）
  async getTrafficVolume(interval: string = '5m', timeRange?: { start?: Date; end?: Date }) {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: { timestamp: true, length: true },
      orderBy: { timestamp: 'asc' },
      take: 10000,
    });

    return this.generateTimeSeriesData(packets, interval);
  }

  // 分析特定数据包
  async analyzePacket(packetId: number) {
    const packet = await this.prisma.packet.findUnique({
      where: { id: packetId }
    });

    if (!packet) {
      return { error: 'Packet not found' };
    }

    // 使用分析服务进行分析
    const analysisResult = await this.analysisService.analyzeTrafficByCondition({
      id: packetId
    });

    return {
      packet,
      analysis: analysisResult
    };
  }

  // 计算流量统计
  private calculateStats(packets: any[]) {
    if (packets.length === 0) {
      return {
        count: 0,
        totalBytes: 0,
        avgSize: 0,
        protocols: {},
        timeRange: null,
      };
    }

    const count = packets.length;
    const totalBytes = packets.reduce((sum, p) => sum + p.length, 0);
    const avgSize = totalBytes / count;
    
    // 协议统计
    const protocols: Record<string, number> = {};
    for (const packet of packets) {
      protocols[packet.protocol] = (protocols[packet.protocol] || 0) + 1;
    }
    
    // 获取时间范围
    const timestamps = packets.map(p => new Date(p.timestamp).getTime());
    const timeRange = {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };
    
    // 计算来源和目标IP统计
    const sourceIPs = this.getTopN(packets.map(p => p.sourceIp), 5);
    const destIPs = this.getTopN(packets.map(p => p.destinationIp), 5);
    
    return {
      count,
      totalBytes,
      avgSize,
      protocols,
      sourceIPs,
      destIPs,
      timeRange,
    };
  }
  
  // 生成时间序列数据
  private generateTimeSeriesData(packets: any[], interval: string) {
    if (packets.length === 0) {
      return [];
    }
    
    // 解析时间间隔
    const intervalMinutes = this.parseIntervalToMinutes(interval);
    
    // 将数据包按时间间隔分组
    const timestamps = packets.map(p => new Date(p.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    // 创建时间桶
    const timeBuckets: Record<string, any> = {};
    let currentTime = minTime;
    
    while (currentTime <= maxTime) {
      const bucket = new Date(currentTime).toISOString();
      timeBuckets[bucket] = { count: 0, bytes: 0, time: new Date(currentTime) };
      currentTime += intervalMinutes * 60 * 1000;
    }
    
    // 填充数据
    for (const packet of packets) {
      const packetTime = new Date(packet.timestamp).getTime();
      const bucketTime = new Date(
        Math.floor(packetTime / (intervalMinutes * 60 * 1000)) * intervalMinutes * 60 * 1000
      ).toISOString();
      
      if (timeBuckets[bucketTime]) {
        timeBuckets[bucketTime].count++;
        timeBuckets[bucketTime].bytes += packet.length || 0;
      }
    }
    
    // 转换为数组格式，并确保按时间排序
    return Object.values(timeBuckets).sort((a: any, b: any) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });
  }
  
  // 获取出现次数最多的N个元素
  private getTopN(items: any[], n: number) {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item] = (counts[item] || 0) + 1;
    }
    
    return Object.entries(counts)
      .map(([item, count]) => ({ item, count: count as number }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, n);
  }
  
  // 解析时间间隔字符串为分钟数
  private parseIntervalToMinutes(interval: string): number {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) return 5; // 默认5分钟
    
    const [, value, unit] = match;
    const numValue = parseInt(value, 10);
    
    switch (unit) {
      case 's': return numValue / 60;
      case 'm': return numValue;
      case 'h': return numValue * 60;
      case 'd': return numValue * 60 * 24;
      default: return 5;
    }
  }
}