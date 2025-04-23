import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NetworkNode, NetworkLink, TopologyData } from './dto/topology.dto';

@Injectable()
export class TopologyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取网络拓扑数据
   * @param timeRange 时间范围
   * @returns 拓扑图数据，包含节点和连接
   */
  async getNetworkTopology(timeRange?: { start?: Date; end?: Date }): Promise<TopologyData> {
    // 构建查询条件
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    console.log('查询拓扑数据，条件:', JSON.stringify(where));

    // 获取时间范围内的数据包
    const packets = await this.prisma.packet.findMany({
      where,
      select: {
        sourceIp: true,
        destinationIp: true,
        protocol: true,
        length: true,
        timestamp: true,
      },
      take: 10000, // 限制最大返回数量
    });

    console.log(`获取到 ${packets.length} 条数据包记录用于构建网络拓扑`);

    // 统计IP和连接信息
    const nodes = new Map<string, NetworkNode>();
    const links = new Map<string, NetworkLink>();
    const privateIpPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|0\.0\.0\.0)/;

    for (const packet of packets) {
      const { sourceIp, destinationIp, protocol, length } = packet;
      
      // 跳过无效IP
      if (sourceIp === '0.0.0.0' || destinationIp === '0.0.0.0') {
        continue;
      }

      // 添加源节点
      if (!nodes.has(sourceIp)) {
        nodes.set(sourceIp, {
          id: sourceIp,
          name: sourceIp,
          value: 1,
          type: privateIpPattern.test(sourceIp) ? 'internal' : 'external',
          category: privateIpPattern.test(sourceIp) ? 0 : 1,
          packetsSent: 1,
          packetsReceived: 0,
          totalBytesSent: length,
          totalBytesReceived: 0,
          protocols: { [protocol]: 1 }
        });
      } else {
        const node = nodes.get(sourceIp);
        node.value += 1;
        node.packetsSent += 1;
        node.totalBytesSent += length;
        node.protocols[protocol] = (node.protocols[protocol] || 0) + 1;
      }

      // 添加目标节点
      if (!nodes.has(destinationIp)) {
        nodes.set(destinationIp, {
          id: destinationIp,
          name: destinationIp,
          value: 1,
          type: privateIpPattern.test(destinationIp) ? 'internal' : 'external',
          category: privateIpPattern.test(destinationIp) ? 0 : 1,
          packetsSent: 0,
          packetsReceived: 1,
          totalBytesSent: 0,
          totalBytesReceived: length,
          protocols: { [protocol]: 1 }
        });
      } else {
        const node = nodes.get(destinationIp);
        node.value += 1;
        node.packetsReceived += 1;
        node.totalBytesReceived += length;
        node.protocols[protocol] = (node.protocols[protocol] || 0) + 1;
      }

      // 添加连接
      const linkId = `${sourceIp}-${destinationIp}`;
      if (!links.has(linkId)) {
        links.set(linkId, {
          source: sourceIp,
          target: destinationIp,
          value: 1,
          protocol: protocol,
          packets: 1,
          bytes: length
        });
      } else {
        const link = links.get(linkId);
        link.value += 1;
        link.packets += 1;
        link.bytes += length;
      }
    }

    // 计算节点的协议分布
    for (const node of nodes.values()) {
      const protocols = Object.entries(node.protocols);
      node.mainProtocol = protocols.sort((a, b) => b[1] - a[1])[0]?.[0] || 'UNKNOWN';
    }

    // 创建返回数据
    return {
      nodes: Array.from(nodes.values()),
      links: Array.from(links.values()),
      summary: {
        nodeCount: nodes.size,
        linkCount: links.size,
        internalNodes: Array.from(nodes.values()).filter(n => n.type === 'internal').length,
        externalNodes: Array.from(nodes.values()).filter(n => n.type === 'external').length,
        totalPackets: packets.length
      }
    };
  }

  /**
   * 获取特定节点的详细信息
   * @param nodeId 节点ID（IP地址）
   * @param timeRange 时间范围
   * @returns 节点详细信息
   */
  async getNodeDetails(nodeId: string, timeRange?: { start?: Date; end?: Date }) {
    // 构建查询条件
    const where: any = {};
    if (timeRange) {
      where.timestamp = {};
      if (timeRange.start) where.timestamp.gte = timeRange.start;
      if (timeRange.end) where.timestamp.lte = timeRange.end;
    }

    // 查询该IP相关的所有数据包
    const sentPackets = await this.prisma.packet.findMany({
      where: {
        ...where,
        sourceIp: nodeId
      },
      select: {
        destinationIp: true,
        protocol: true,
        length: true,
        timestamp: true
      },
      take: 1000
    });

    const receivedPackets = await this.prisma.packet.findMany({
      where: {
        ...where,
        destinationIp: nodeId
      },
      select: {
        sourceIp: true,
        protocol: true,
        length: true,
        timestamp: true
      },
      take: 1000
    });

    // 统计连接到的IP
    const connectedIps = new Map<string, { sent: number; received: number; totalBytes: number }>();
    
    // 处理发送的包
    for (const packet of sentPackets) {
      const ip = packet.destinationIp;
      if (!connectedIps.has(ip)) {
        connectedIps.set(ip, { sent: 0, received: 0, totalBytes: 0 });
      }
      const data = connectedIps.get(ip);
      data.sent += 1;
      data.totalBytes += packet.length;
    }

    // 处理接收的包
    for (const packet of receivedPackets) {
      const ip = packet.sourceIp;
      if (!connectedIps.has(ip)) {
        connectedIps.set(ip, { sent: 0, received: 0, totalBytes: 0 });
      }
      const data = connectedIps.get(ip);
      data.received += 1;
      data.totalBytes += packet.length;
    }

    // 统计协议分布
    const protocolStats = {};
    for (const packet of [...sentPackets, ...receivedPackets]) {
      const protocol = packet.protocol;
      protocolStats[protocol] = (protocolStats[protocol] || 0) + 1;
    }

    // 计算时间序列数据（按小时分组）
    const timeSeriesData = this.generateHourlyTimeSeriesData([...sentPackets, ...receivedPackets]);

    // 返回节点详细信息
    return {
      nodeId,
      totalPacketsSent: sentPackets.length,
      totalPacketsReceived: receivedPackets.length,
      totalBytesSent: sentPackets.reduce((sum, p) => sum + p.length, 0),
      totalBytesReceived: receivedPackets.reduce((sum, p) => sum + p.length, 0),
      connectedNodes: Array.from(connectedIps.entries()).map(([ip, data]) => ({
        ip,
        packetsSent: data.sent,
        packetsReceived: data.received,
        totalBytes: data.totalBytes
      })),
      protocolDistribution: Object.entries(protocolStats).map(([protocol, count]) => ({
        protocol,
        count: count as number,
        percentage: (count as number) / (sentPackets.length + receivedPackets.length) * 100
      })),
      trafficTrend: timeSeriesData
    };
  }

  /**
   * 生成小时级别的时间序列数据
   * @param packets 数据包列表
   * @returns 按小时分组的流量数据
   */
  private generateHourlyTimeSeriesData(packets: any[]) {
    if (packets.length === 0) return [];

    // 按小时分组数据
    const hourlyData = new Map<string, { packets: number; bytes: number }>();
    
    for (const packet of packets) {
      const timestamp = new Date(packet.timestamp);
      // 将时间格式化为 YYYY-MM-DD HH:00
      const hourKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:00`;
      
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, { packets: 0, bytes: 0 });
      }
      
      const data = hourlyData.get(hourKey);
      data.packets += 1;
      data.bytes += packet.length;
    }

    // 转换为数组并排序
    return Array.from(hourlyData.entries())
      .map(([time, data]) => ({
        time,
        packets: data.packets,
        bytes: data.bytes
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }
} 