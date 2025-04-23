import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as tf from '@tensorflow/tfjs';
import { AnalysisService } from '../analysis/analysis.service';
import { IpStatItem, RealtimeTrafficData, StatisticsResult, TrafficTrendData } from './traffic.types';

@Injectable()
export class TrafficService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AnalysisService))
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
  async getTopSources(limit: number = 10, timeRange?: { start?: Date; end?: Date }): Promise<IpStatItem[]> {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: { sourceIp: true },
      take: 10000,
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
  async getTopDestinations(limit: number = 10, timeRange?: { start?: Date; end?: Date }): Promise<IpStatItem[]> {
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
    try {
      const packet = await this.prisma.packet.findUnique({
        where: { id: packetId }
      });

      if (!packet) {
        return { error: 'Packet not found' };
      }

      // 确保分析服务可用
      if (!this.analysisService || typeof this.analysisService.analyzeTrafficByCondition !== 'function') {
        console.warn('分析服务不可用');
        return {
          packet,
          analysis: { status: 'unavailable', message: '分析服务不可用' }
        };
      }

      try {
        // 使用分析服务进行分析
        const analysisResult = await this.analysisService.analyzeTrafficByCondition({
          id: packetId
        });

        return {
          packet,
          analysis: analysisResult
        };
      } catch (analysisError) {
        console.error('调用分析服务出错:', analysisError);
        return {
          packet,
          analysis: { status: 'error', message: `分析失败: ${analysisError.message}` }
        };
      }
    } catch (error) {
      console.error('分析数据包失败:', error);
      throw new Error(`分析数据包失败: ${error.message}`);
    }
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

  // 获取活跃连接
  async getActiveConnections(limit: number = 20, timeRange?: { start?: Date; end?: Date }) {
    try {
      const where: any = {};
      if (timeRange) {
        where.timestamp = {};
        if (timeRange.start) where.timestamp.gte = timeRange.start;
        if (timeRange.end) where.timestamp.lte = timeRange.end;
      }

      console.log('查询活跃连接，条件:', JSON.stringify(where));

      const packets = await this.prisma.packet.findMany({
        where,
        select: {
          sourceIp: true,
          destinationIp: true,
          sourcePort: true,
          destinationPort: true,
          protocol: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 5000, // 获取足够的数据进行统计
      });

      console.log(`获取到 ${packets.length} 条数据包记录`);

      // 统计连接信息
      const connections: Record<string, any> = {};
      for (const packet of packets) {
        const key = `${packet.sourceIp}:${packet.sourcePort}-${packet.destinationIp}:${packet.destinationPort}-${packet.protocol}`;
        if (!connections[key]) {
          connections[key] = {
            sourceIp: packet.sourceIp,
            sourcePort: packet.sourcePort,
            destinationIp: packet.destinationIp,
            destinationPort: packet.destinationPort,
            protocol: packet.protocol,
            count: 0,
            lastSeen: packet.timestamp,
            firstSeen: packet.timestamp,
          };
        }
        
        connections[key].count++;
        if (packet.timestamp > connections[key].lastSeen) {
          connections[key].lastSeen = packet.timestamp;
        }
        if (packet.timestamp < connections[key].firstSeen) {
          connections[key].firstSeen = packet.timestamp;
        }
      }

      // 转换为数组并排序
      const activeConnections = Object.values(connections)
        .sort((a, b) => b.count - a.count || b.lastSeen.getTime() - a.lastSeen.getTime())
        .slice(0, limit);

      return {
        total: Object.keys(connections).length,
        connections: activeConnections,
      };
    } catch (error) {
      console.error('获取活跃连接错误:', error);
      throw new Error(`获取活跃连接失败: ${error.message}`);
    }
  }

  // 获取端口使用情况
  async getPortUsage(limit: number = 20, direction: string = 'both', timeRange?: { start?: Date; end?: Date }) {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: {
        sourcePort: true,
        destinationPort: true,
        protocol: true,
      },
      take: 10000,
    });

    // 统计端口使用情况
    const portCounts: Record<string, any> = {};
    for (const packet of packets) {
      // 处理源端口
      if (direction === 'source' || direction === 'both') {
        const sourceKey = `${packet.sourcePort}:${packet.protocol}:source`;
        if (!portCounts[sourceKey]) {
          portCounts[sourceKey] = {
            port: packet.sourcePort,
            protocol: packet.protocol,
            direction: 'source',
            count: 0,
          };
        }
        portCounts[sourceKey].count++;
      }
      
      // 处理目标端口
      if (direction === 'destination' || direction === 'both') {
        const destKey = `${packet.destinationPort}:${packet.protocol}:destination`;
        if (!portCounts[destKey]) {
          portCounts[destKey] = {
            port: packet.destinationPort,
            protocol: packet.protocol,
            direction: 'destination',
            count: 0,
          };
        }
        portCounts[destKey].count++;
      }
    }

    // 转换为数组并排序
    const portUsage = Object.values(portCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // 添加常见服务名称
    const portToService: Record<number, string> = {
      80: 'HTTP',
      443: 'HTTPS',
      22: 'SSH',
      21: 'FTP',
      25: 'SMTP',
      110: 'POP3',
      143: 'IMAP',
      53: 'DNS',
      3389: 'RDP',
      3306: 'MySQL',
      5432: 'PostgreSQL',
      1433: 'SQL Server',
      27017: 'MongoDB',
      6379: 'Redis',
      8080: 'HTTP-Proxy',
      8443: 'HTTPS-Alt',
    };

    for (const port of portUsage) {
      port.service = portToService[port.port] || 'Unknown';
    }

    return {
      total: Object.keys(portCounts).length,
      ports: portUsage,
    };
  }

  // 获取流量趋势
  async getTrafficTrend(interval: string = 'hourly', metric: string = 'packets', days: number = 7): Promise<TrafficTrendData> {
    // 计算起始时间
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 查询数据
    const packets = await this.prisma.packet.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        timestamp: true,
        length: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // 准备结果数据
    const result: any[] = [];
    const formatDate = (date: Date, intervalType: string) => {
      if (intervalType === 'hourly') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else if (intervalType === 'daily') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else if (intervalType === 'weekly') {
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 调整为周一为起始
        const monday = new Date(date.setDate(diff));
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      }
      return date.toISOString();
    };

    // 按时间间隔分组数据
    const grouped: Record<string, any> = {};
    for (const packet of packets) {
      const key = formatDate(new Date(packet.timestamp), interval);
      if (!grouped[key]) {
        grouped[key] = {
          time: key,
          packets: 0,
          bytes: 0,
        };
      }
      grouped[key].packets++;
      grouped[key].bytes += packet.length;
    }

    // 转换为数组
    for (const key in grouped) {
      result.push(grouped[key]);
    }

    return {
      interval,
      metric,
      data: result.sort((a, b) => a.time.localeCompare(b.time)),
    };
  }

  // 获取流量地理分布
  async getGeoDistribution(timeRange?: { start?: Date; end?: Date }) {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: {
        sourceIp: true,
        destinationIp: true,
      },
      take: 10000,
    });

    // 这里需要IP地理位置查询服务
    // 简化实现，返回模拟数据
    const result = {
      domestic: {
        count: 0,
        percentage: 0,
        regions: [],
      },
      international: {
        count: 0,
        percentage: 0,
        countries: [],
      },
    };

    // 模拟一些数据
    const ipCount = packets.length;
    
    // 国内流量占比
    result.domestic.count = Math.floor(ipCount * 0.65);
    result.domestic.percentage = 65;
    result.domestic.regions = [
      { name: '北京', count: Math.floor(ipCount * 0.15), percentage: 15 },
      { name: '上海', count: Math.floor(ipCount * 0.12), percentage: 12 },
      { name: '广东', count: Math.floor(ipCount * 0.10), percentage: 10 },
      { name: '浙江', count: Math.floor(ipCount * 0.08), percentage: 8 },
      { name: '江苏', count: Math.floor(ipCount * 0.07), percentage: 7 },
      { name: '其他', count: Math.floor(ipCount * 0.13), percentage: 13 },
    ];
    
    // 国际流量占比
    result.international.count = Math.floor(ipCount * 0.35);
    result.international.percentage = 35;
    result.international.countries = [
      { name: '美国', count: Math.floor(ipCount * 0.15), percentage: 15 },
      { name: '日本', count: Math.floor(ipCount * 0.05), percentage: 5 },
      { name: '德国', count: Math.floor(ipCount * 0.04), percentage: 4 },
      { name: '新加坡', count: Math.floor(ipCount * 0.03), percentage: 3 },
      { name: '英国', count: Math.floor(ipCount * 0.03), percentage: 3 },
      { name: '其他', count: Math.floor(ipCount * 0.05), percentage: 5 },
    ];

    return result;
  }

  // 获取通信对统计
  async getCommunicationPairs(limit: number = 20, timeRange?: { start?: Date; end?: Date }) {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: {
        sourceIp: true,
        destinationIp: true,
        sourcePort: true,
        destinationPort: true,
        protocol: true,
        length: true,
      },
      take: 10000,
    });

    // 统计通信对
    const pairs: Record<string, any> = {};
    for (const packet of packets) {
      const key = `${packet.sourceIp}-${packet.destinationIp}`;
      if (!pairs[key]) {
        pairs[key] = {
          sourceIp: packet.sourceIp,
          destinationIp: packet.destinationIp,
          packetCount: 0,
          totalBytes: 0,
          protocols: {},
        };
      }
      
      pairs[key].packetCount++;
      pairs[key].totalBytes += packet.length;
      
      // 统计协议使用情况
      if (!pairs[key].protocols[packet.protocol]) {
        pairs[key].protocols[packet.protocol] = 0;
      }
      pairs[key].protocols[packet.protocol]++;
    }

    // 转换为数组并排序
    const communicationPairs = Object.values(pairs)
      .sort((a, b) => b.packetCount - a.packetCount)
      .slice(0, limit);

    // 转换协议统计为数组格式
    for (const pair of communicationPairs) {
      const protocols = [];
      for (const proto in pair.protocols) {
        protocols.push({
          protocol: proto,
          count: pair.protocols[proto],
          percentage: (pair.protocols[proto] / pair.packetCount) * 100,
        });
      }
      pair.protocolStats = protocols.sort((a, b) => b.count - a.count);
      delete pair.protocols;
    }

    return {
      total: Object.keys(pairs).length,
      pairs: communicationPairs,
    };
  }

  // 获取数据包大小分布
  async getPacketSizeDistribution(timeRange?: { start?: Date; end?: Date }) {
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    const packets = await this.prisma.packet.findMany({
      where,
      select: {
        length: true,
      },
      take: 10000,
    });

    // 定义大小分组
    const sizeRanges = [
      { min: 0, max: 64, label: '0-64 bytes' },
      { min: 65, max: 128, label: '65-128 bytes' },
      { min: 129, max: 256, label: '129-256 bytes' },
      { min: 257, max: 512, label: '257-512 bytes' },
      { min: 513, max: 1024, label: '513-1024 bytes' },
      { min: 1025, max: 1500, label: '1025-1500 bytes' },
      { min: 1501, max: Infinity, label: '>1500 bytes' },
    ];

    // 初始化分组计数
    const distribution = sizeRanges.map(range => ({ ...range, count: 0, percentage: 0 }));

    // 统计分布
    for (const packet of packets) {
      for (const range of distribution) {
        if (packet.length >= range.min && packet.length <= range.max) {
          range.count++;
          break;
        }
      }
    }

    // 计算百分比
    const totalPackets = packets.length;
    for (const range of distribution) {
      range.percentage = totalPackets > 0 ? (range.count / totalPackets) * 100 : 0;
    }

    // 计算统计信息
    const sizes = packets.map(p => p.length);
    const stats = {
      min: Math.min(...sizes),
      max: Math.max(...sizes),
      avg: sizes.reduce((sum, size) => sum + size, 0) / totalPackets,
      median: this.calculateMedian(sizes),
    };

    return {
      total: totalPackets,
      distribution,
      stats,
    };
  }

  // 计算中位数
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  // 获取实时流量监控数据
  async getRealtimeTraffic(): Promise<RealtimeTrafficData> {
    // 获取最近30分钟的数据 (之前只查询5分钟，可能导致数据不足)
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    console.log(`查询实时流量数据，时间范围: ${thirtyMinutesAgo.toISOString()} 到 ${new Date().toISOString()}`);
    
    // 查询最近的数据包
    const packets = await this.prisma.packet.findMany({
      where: {
        timestamp: {
          gte: thirtyMinutesAgo,
        },
      },
      select: {
        timestamp: true,
        length: true,
        protocol: true,
      },
      orderBy: { timestamp: 'asc' },
      take: 1000, // 增加查询上限
    });

    console.log(`查询到 ${packets.length} 条实时流量数据包`);
    
    // 记录每个数据包的时间戳，帮助调试
    if (packets.length > 0) {
      console.log(`最早数据包时间: ${new Date(packets[0].timestamp).toISOString()}`);
      console.log(`最新数据包时间: ${new Date(packets[packets.length-1].timestamp).toISOString()}`);
    }

    // 如果没有数据，尝试获取任何时间的数据包作为回退
    if (packets.length === 0) {
      console.log('没有找到最近30分钟的流量数据，尝试获取最新的100条记录');
      const latestPackets = await this.prisma.packet.findMany({
        select: {
          timestamp: true,
          length: true,
          protocol: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
      
      console.log(`查询到 ${latestPackets.length} 条最新流量数据包`);
      if (latestPackets.length > 0) {
        // 按时间升序排序，与上面的逻辑保持一致
        packets.push(...latestPackets.reverse());
      }
    }

    // 按10秒间隔分组
    const intervals: Record<string, any> = {};
    for (const packet of packets) {
      // 确保timestamp是Date对象
      const packetTime = packet.timestamp instanceof Date ? packet.timestamp : new Date(packet.timestamp);
      
      // 向下取整到最近的10秒
      const timestamp = new Date(packetTime);
      timestamp.setSeconds(Math.floor(timestamp.getSeconds() / 10) * 10);
      timestamp.setMilliseconds(0);
      
      const key = timestamp.toISOString();
      if (!intervals[key]) {
        intervals[key] = {
          timestamp: key,
          packetCount: 0,
          byteCount: 0,
          protocols: {},
        };
      }
      
      intervals[key].packetCount++;
      intervals[key].byteCount += packet.length;
      
      // 统计协议
      if (!intervals[key].protocols[packet.protocol]) {
        intervals[key].protocols[packet.protocol] = 0;
      }
      intervals[key].protocols[packet.protocol]++;
    }

    // 转换为数组
    const timePoints = Object.values(intervals).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log(`生成了 ${timePoints.length} 个时间点数据`);

    // 计算速率
    for (let i = 1; i < timePoints.length; i++) {
      const current = timePoints[i];
      const prev = timePoints[i - 1];
      
      const timeDiff = (new Date(current.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000; // 秒
      if (timeDiff > 0) {
        current.packetsPerSecond = current.packetCount / timeDiff;
        current.bytesPerSecond = current.byteCount / timeDiff;
      } else {
        current.packetsPerSecond = 0;
        current.bytesPerSecond = 0;
      }
    }
    
    // 如果第一个点没有速率，设为0
    if (timePoints.length > 0) {
      if (!timePoints[0].packetsPerSecond) timePoints[0].packetsPerSecond = 0;
      if (!timePoints[0].bytesPerSecond) timePoints[0].bytesPerSecond = 0;
    }

    // 计算总计和平均值
    const totalPackets = packets.length;
    const totalBytes = packets.reduce((sum, p) => sum + p.length, 0);
    const duration = packets.length > 1 ? 
      (new Date(packets[packets.length - 1].timestamp).getTime() - new Date(packets[0].timestamp).getTime()) / 1000 : 0;
    
    const summary = {
      totalPackets,
      totalBytes,
      avgPacketsPerSecond: duration > 0 ? totalPackets / duration : 0,
      avgBytesPerSecond: duration > 0 ? totalBytes / duration : 0,
      duration: duration,
    };

    // 记录最终返回的数据摘要
    console.log(`实时流量数据摘要: 总数据包: ${totalPackets}, 总字节: ${totalBytes}, 平均每秒数据包: ${summary.avgPacketsPerSecond}, 平均每秒字节: ${summary.avgBytesPerSecond}`);

    return {
      summary,
      timePoints,
    };
  }

  // 获取流量统计聚合数据 - 汇总多个接口的数据
  async getAllTrafficMetrics(options: {
    timeRange?: { start?: Date; end?: Date };
    interval?: string;
    limit?: number;
    includeRealtime?: boolean;
    includeTrafficTrend?: boolean;
    includePackets?: boolean;
    days?: number;
  } = {}) {
    try {
      console.log('开始获取流量统计聚合数据');
      
      // 设置默认值
      const limit = options.limit || 10;
      const interval = options.interval || '5m';
      const includeRealtime = options.includeRealtime !== false;
      const includeTrafficTrend = options.includeTrafficTrend !== false;
      const includePackets = options.includePackets || false;
      const days = options.days || 7;
      
      // 设置通用的时间范围 - 默认获取最近24小时
      let timeRange = options.timeRange;
      if (!timeRange) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - 24);
        timeRange = { start: startDate, end: endDate };
      }
      
      // 准备Promise数组
      const promises: Promise<StatisticsResult>[] = [
        this.getTrafficStats(timeRange, interval) as Promise<StatisticsResult>,            // 基本流量统计
        this.getTopSources(limit, timeRange) as Promise<StatisticsResult>,                 // 流量来源
        this.getTopDestinations(limit, timeRange) as Promise<StatisticsResult>,            // 流量目标
        this.getProtocolStats(timeRange) as Promise<StatisticsResult>,                     // 协议统计
        this.getActiveConnections(limit, timeRange) as Promise<StatisticsResult>,          // 活跃连接
        this.getCommunicationPairs(limit, timeRange) as Promise<StatisticsResult>,         // 通信对
        this.getPacketSizeDistribution(timeRange) as Promise<StatisticsResult>,            // 数据包大小分布
        this.getApplicationUsage(limit, timeRange) as Promise<StatisticsResult>,           // 应用使用情况
        this.getPortUsage(limit, 'both', timeRange) as Promise<StatisticsResult>,          // 端口使用情况
        this.getGeoDistribution(timeRange) as Promise<StatisticsResult>,                   // 地理分布
      ];
      
      // 可选添加实时流量
      if (includeRealtime) {
        promises.push(this.getRealtimeTraffic() as Promise<StatisticsResult>);
      }
      
      // 可选添加流量趋势
      if (includeTrafficTrend) {
        promises.push(this.getTrafficTrend('hourly', 'packets', days) as Promise<StatisticsResult>);
        promises.push(this.getTrafficTrend('hourly', 'bytes', days) as Promise<StatisticsResult>);
      }
      
      // 可选添加数据包列表
      let packetsList = null;
      if (includePackets) {
        packetsList = await this.getPackets({
          page: 1,
          limit: 100,
          startTime: timeRange.start,
          endTime: timeRange.end,
        });
      }
      
      // 并行获取各种统计数据
      const results = await Promise.all(promises);
      
      // 提取结果
      const [
        basicStats,                  // 基本流量统计
        topSources,                  // 流量来源
        topDestinations,             // 流量目标
        protocolStats,               // 协议统计
        activeConnections,           // 活跃连接
        communicationPairs,          // 通信对
        packetSizeDistribution,      // 数据包大小分布
        applicationUsage,            // 应用使用情况
        portUsage,                   // 端口使用情况
        geoDistribution,             // 地理分布
        ...optionalResults           // 可选的结果
      ] = results;
      
      // 处理可选结果
      let realtimeTraffic = null;
      let packetsTrend = null;
      let bytesTrend = null;
      
      let resultIndex = 0;
      if (includeRealtime) {
        realtimeTraffic = optionalResults[resultIndex++] as RealtimeTrafficData;
      }
      
      if (includeTrafficTrend) {
        packetsTrend = optionalResults[resultIndex++] as TrafficTrendData;
        bytesTrend = optionalResults[resultIndex++] as TrafficTrendData;
      }
      
      // 获取总数据包计数
      const totalPackets = await this.prisma.packet.count();
      const lastPacket = await this.prisma.packet.findFirst({
        orderBy: { timestamp: 'desc' }
      });
      
      // 获取最近一小时的数据量
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      const lastHourPackets = await this.prisma.packet.count({
        where: { timestamp: { gte: oneHourAgo } }
      });
      
      // 计算异常和警报数量
      const anomalies = await this.getAnomalies(limit, { 
        timestamp: { gte: timeRange.start }
      });
      
      // 构建完整结果
      const result: any = {
        summary: {
          totalPackets,
          lastCaptureTime: lastPacket?.timestamp || null,
          lastHourTraffic: lastHourPackets,
          anomalyCount: anomalies.length,
          timeRange: {
            start: timeRange.start,
            end: timeRange.end
          }
        },
        basicStats,
        topSources,
        topDestinations,
        protocolStats: 'stats' in protocolStats ? protocolStats.stats : [],
        activeConnections: 'connections' in activeConnections ? activeConnections.connections : [],
        communicationPairs: 'pairs' in communicationPairs ? communicationPairs.pairs : [],
        packetSizes: 'distribution' in packetSizeDistribution ? packetSizeDistribution.distribution : [],
        applications: 'applications' in applicationUsage ? applicationUsage.applications : [],
        portUsage: 'ports' in portUsage ? portUsage.ports : [],
        geoDistribution,
        anomalies
      };
      
      // 添加可选数据
      if (realtimeTraffic) {
        result.realtimeTraffic = realtimeTraffic;
      }
      
      if (packetsTrend && bytesTrend) {
        result.trafficTrend = {
          packets: packetsTrend.data,
          bytes: bytesTrend.data
        };
      }
      
      if (packetsList) {
        result.recentPackets = packetsList;
      }
      
      return result;
    } catch (error) {
      console.error('获取流量统计聚合数据失败:', error);
      throw new Error(`获取流量统计聚合数据失败: ${error.message}`);
    }
  }

  // 获取网络应用使用情况
  async getApplicationUsage(limit: number = 10, timeRange?: { start?: Date; end?: Date }) {
    try {
      const where: any = {};
      if (timeRange) {
        where.timestamp = {};
        if (timeRange.start) where.timestamp.gte = timeRange.start;
        if (timeRange.end) where.timestamp.lte = timeRange.end;
      }

      console.log('查询应用使用情况，条件:', JSON.stringify(where));

      const packets = await this.prisma.packet.findMany({
        where,
        select: {
          destinationPort: true,
          protocol: true,
          length: true,
        },
        take: 10000,
      });

      console.log(`获取到 ${packets.length} 条数据包记录`);

      // 端口到应用的映射
      const portToApp: Record<number, string> = {
        80: 'HTTP',
        20: 'FTP-Data',
        21: 'FTP-Control',
        22: 'SSH',
        23: 'Telnet',
        25: 'SMTP',
        53: 'DNS',
        110: 'POP3',
        143: 'IMAP',
        194: 'IRC',
        389: 'LDAP',
        443: 'HTTPS',
        465: 'SMTPS',
        587: 'SMTP Submission',
        993: 'IMAPS',
        995: 'POP3S',
        1433: 'Microsoft SQL',
        1521: 'Oracle SQL',
        3306: 'MySQL',
        3389: 'RDP',
        5432: 'PostgreSQL',
        5900: 'VNC',
        8080: 'HTTP Alternate',
        8443: 'HTTPS Alternate',
        9000: 'HTTP Alternate',
      };

      // 统计应用使用情况
      const apps: Record<string, any> = {};
      for (const packet of packets) {
        let appName = portToApp[packet.destinationPort] || 'Unknown';
        
        // 根据端口和协议特殊处理一些应用
        if (packet.protocol === '17' && packet.destinationPort === 53) { // UDP DNS
          appName = 'DNS';
        } else if (packet.protocol === '6' && (packet.destinationPort === 80 || packet.destinationPort === 8080)) { // TCP HTTP
          appName = 'HTTP';
        } else if (packet.protocol === '6' && (packet.destinationPort === 443 || packet.destinationPort === 8443)) { // TCP HTTPS
          appName = 'HTTPS';
        }
        
        if (!apps[appName]) {
          apps[appName] = {
            name: appName,
            packetCount: 0,
            byteCount: 0,
            ports: new Set(),
          };
        }
        
        apps[appName].packetCount++;
        apps[appName].byteCount += packet.length;
        apps[appName].ports.add(packet.destinationPort);
      }

      // 转换为数组
      const appUsage = Object.values(apps).map(app => ({
        name: app.name,
        packetCount: app.packetCount,
        byteCount: app.byteCount,
        ports: Array.from(app.ports),
        percentage: (app.packetCount / packets.length * 100) || 0,
      })).sort((a, b) => b.packetCount - a.packetCount).slice(0, limit);

      return {
        total: Object.keys(apps).length,
        applications: appUsage,
      };
    } catch (error) {
      console.error('获取应用使用情况错误:', error);
      throw new Error(`获取应用使用情况失败: ${error.message}`);
    }
  }
}