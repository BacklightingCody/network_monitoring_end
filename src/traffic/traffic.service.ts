import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as tf from '@tensorflow/tfjs-node';

@Injectable()
export class TrafficService {
  constructor(private readonly prisma: PrismaService) {}

  async getPackets(params: {
    page: number;
    limit: number;
    sourceIp?: string;
    destinationIp?: string;
  }) {
    const { page, limit, sourceIp, destinationIp } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (sourceIp) where.sourceIp = sourceIp;
    if (destinationIp) where.destinationIp = destinationIp;

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

  async analyzeTraffic(packetId?: number) {
    let packets;
    if (packetId) {
      packets = await this.prisma.packet.findMany({
        where: { id: packetId },
      });
    } else {
      packets = await this.prisma.packet.findMany({
        take: 1000,
        orderBy: { timestamp: 'desc' },
      });
    }

    if (!packets.length) {
      return { message: 'No packets found for analysis' };
    }

    // 数据预处理
    const features = packets.map(p => [
      p.length || 0,
      p.sourcePort || 0,
      p.destinationPort || 0,
      parseInt(p.tcpFlags || '0', 16),
    ]);

    // 使用 TensorFlow.js 进行异常检测
    const tensorData = tf.tensor2d(features);
    const mean = tensorData.mean(0);
    const std = tensorData.sub(mean).square().mean(0).sqrt();
    const zScores = tensorData.sub(mean).div(std);

    // 添加类型断言
    const anomalies = (zScores.arraySync() as number[][]).map((row, idx) => {
      const isAnomaly = row.some(z => Math.abs(z) > 3);
      return isAnomaly ? packets[idx] : null;
    }).filter(p => p);

    // 保存分析结果
    const analysisResults = await Promise.all(
      anomalies.map(async (packet) => {
        return this.prisma.trafficAnalysis.create({
          data: {
            packetId: packet.id,
            analysisResult: 'Potential anomaly detected (high z-score)',
          },
        });
      }),
    );

    return {
      analyzedPackets: packets.length,
      anomaliesFound: anomalies.length,
      analysisResults,
    };
  }
}