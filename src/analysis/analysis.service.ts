import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Interval } from '@nestjs/schedule';
import { MlServiceConfig } from '../config/ml-service.config';
import { firstValueFrom } from 'rxjs';
import { PythonService } from './python-service';

@Injectable()
@WebSocketGateway({ cors: true })
export class AnalysisService implements OnModuleInit {
  @WebSocketServer() server: Server;
  
  // 存储最近的流量数据以进行分析
  private recentPackets: any[] = [];
  // 存储检测到的流量异常
  private anomalies: any[] = [];
  // 攻击检测阈值
  private thresholds = {
    ddosThreshold: 200, // DDoS攻击阈值（每秒包数）
    portScanThreshold: 15, // 端口扫描阈值（不同端口数量）
    synFloodThreshold: 100, // SYN洪水攻击阈值
  };
  // 分析引擎状态
  private pythonServiceAvailable = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly httpService: HttpService,
    private readonly mlConfig: MlServiceConfig,
    private readonly pythonService: PythonService,
  ) {}

  async onModuleInit() {
    // 检查Python分析服务是否可用
    try {
      const isHealthy = await this.pythonService.checkServiceHealth();
      this.pythonServiceAvailable = isHealthy;
      if (isHealthy) {
        console.log('✅ Python分析服务已就绪');
      } else {
        console.error('❌ Python分析服务未就绪，部分功能将不可用');
      }
    } catch (error) {
      this.pythonServiceAvailable = false;
      console.error('❌ Python分析服务连接失败:', error.message);
    }
    
    // 开始实时分析
    this.startRealTimeAnalysis();
  }

  // 开始实时分析
  private startRealTimeAnalysis() {
    console.log('开始实时流量分析...');
  }

  // 每5秒执行一次分析
  @Interval(5000)
  async analyzeTraffic() {
    try {
      // 获取最近的数据包
      const recentPackets = await this.prisma.packet.findMany({
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });

      // 更新最近数据包缓存
      this.recentPackets = recentPackets;

      // 执行各种分析
      await Promise.all([
        this.detectDDoSAttack(),
        this.detectPortScanning(),
        this.detectSynFloodAttack(),
        this.analyzeWithPython(),
      ]);

      // 发送分析结果到WebSocket
      if (this.server) {
        this.server.emit('traffic-analysis', {
          timestamp: new Date(),
          anomalies: this.anomalies,
          stats: this.generateTrafficStats(),
        });
      }
    } catch (error) {
      console.error('流量分析错误:', error);
    }
  }

  // 检测DDoS攻击
  private async detectDDoSAttack() {
    const now = new Date();
    const oneSecondAgo = new Date(now.getTime() - 1000);

    // 获取最近1秒内的数据包数量
    const packetsPerSecond = this.recentPackets.filter(
      packet => new Date(packet.timestamp) >= oneSecondAgo
    ).length;

    if (packetsPerSecond > this.thresholds.ddosThreshold) {
      // 检测到可能的DDoS攻击
      const anomaly = {
        timestamp: now,
        type: 'DDoS Attack',
        severity: 'High',
        description: `检测到可能的DDoS攻击: ${packetsPerSecond} 包/秒`,
      };

      // 存储异常记录
      await this.storeAnomaly(anomaly);
    }
  }

  // 检测端口扫描
  private async detectPortScanning() {
    // 分析来自同一源IP的不同目标端口
    const sourceIpMap = new Map();

    for (const packet of this.recentPackets) {
      const { sourceIp, destinationPort } = packet;
      
      if (!sourceIpMap.has(sourceIp)) {
        sourceIpMap.set(sourceIp, new Set());
      }
      
      sourceIpMap.get(sourceIp).add(destinationPort);
    }

    // 检查是否有源IP访问了过多的不同端口
    for (const [sourceIp, ports] of sourceIpMap.entries()) {
      if (ports.size > this.thresholds.portScanThreshold) {
        // 检测到可能的端口扫描
        const anomaly = {
          timestamp: new Date(),
          type: 'Port Scanning',
          severity: 'Medium',
          description: `检测到可能的端口扫描: IP ${sourceIp} 访问了 ${ports.size} 个不同端口`,
        };

        // 存储异常记录
        await this.storeAnomaly(anomaly);
      }
    }
  }

  // 检测SYN洪水攻击
  private async detectSynFloodAttack() {
    // 获取所有TCP SYN包（协议为TCP且有SYN标志）
    const synPackets = this.recentPackets.filter(packet => 
      packet.protocol === 'TCP' && 
      packet.tcpFlags && 
      packet.tcpFlags.includes('SYN')
    );

    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    
    // 计算最近5秒内的SYN包数量
    const recentSynPackets = synPackets.filter(
      packet => new Date(packet.timestamp) >= fiveSecondsAgo
    ).length;

    if (recentSynPackets > this.thresholds.synFloodThreshold) {
      // 检测到可能的SYN洪水攻击
      const anomaly = {
        timestamp: now,
        type: 'SYN Flood Attack',
        severity: 'High',
        description: `检测到可能的SYN洪水攻击: ${recentSynPackets} SYN包/5秒`,
      };

      // 存储异常记录
      await this.storeAnomaly(anomaly);
    }
  }

  // 使用Python服务进行分析
  private async analyzeWithPython() {
    if (!this.pythonServiceAvailable || this.recentPackets.length < 10) return; // 数据不够，跳过

    try {
      // 准备数据
      const packetFeatures = this.recentPackets.slice(0, 100).map(packet => ({
        id: packet.id,
        length: packet.length,
        sourcePort: packet.sourcePort,
        destinationPort: packet.destinationPort,
        protocol: packet.protocol,
        tcpFlags: packet.tcpFlags,
        sourceIp: packet.sourceIp,
        destinationIp: packet.destinationIp,
        timestamp: packet.timestamp
      }));

      // 使用Python服务进行批量分析
      const result = await this.pythonService.batchPredict(packetFeatures);
      
      // 处理异常检测结果
      if (result.anomalies && result.anomalies.length > 0) {
        for (const anomalyIndex of result.anomalies) {
          const packet = this.recentPackets[anomalyIndex];
          const score = result.scores ? result.scores[anomalyIndex] : 0;
          
          const anomaly = {
            timestamp: new Date(),
            type: 'ML Detected Anomaly',
            severity: 'Medium',
            description: `机器学习模型检测到流量异常，异常分数: ${score.toFixed(2)}`,
            packetId: packet.id,
          };
          
          await this.storeAnomaly(anomaly);
        }
      }
      
      // 处理攻击分类结果
      if (result.classifications) {
        // 计算各类别的数量
        const classCounts = {
          normal: 0,
          ddos: 0,
          portscan: 0,
          other: 0
        };
        
        result.classifications.forEach(classification => {
          if (classCounts[classification] !== undefined) {
            classCounts[classification]++;
          } else {
            classCounts.other++;
          }
        });
        
        // 如果有大量流量被分类为异常类型，生成一个综合异常
        if (classCounts.ddos > 30) {
          await this.storeAnomaly({
            timestamp: new Date(),
            type: 'ML DDoS Detection',
            severity: 'High',
            description: `机器学习模型检测到可能的DDoS攻击，${classCounts.ddos} 个数据包被分类为DDoS流量`,
          });
        }
        
        if (classCounts.portscan > 20) {
          await this.storeAnomaly({
            timestamp: new Date(),
            type: 'ML Port Scan Detection',
            severity: 'Medium',
            description: `机器学习模型检测到可能的端口扫描，${classCounts.portscan} 个数据包被分类为端口扫描流量`,
          });
        }
      }
    } catch (error) {
      console.error('Python分析服务调用失败:', error);
    }
  }

  // 存储异常记录
  private async storeAnomaly(anomaly) {
    try {
      // 避免短时间内重复记录相同类型的异常
      const recentSimilarAnomaly = this.anomalies.find(a => 
        a.type === anomaly.type && 
        (new Date().getTime() - new Date(a.timestamp).getTime()) < 60000 // 1分钟内
      );
      
      if (recentSimilarAnomaly) {
        return; // 跳过重复记录
      }
      
      // 添加到内存中的异常列表
      this.anomalies.unshift(anomaly);
      // 限制内存中存储的异常数量
      if (this.anomalies.length > 100) {
        this.anomalies.pop();
      }
      
      // 将异常存入数据库
      await this.prisma.anomaly.create({
        data: {
          timestamp: anomaly.timestamp,
          type: anomaly.type,
          severity: anomaly.severity,
          description: anomaly.description,
          packetId: anomaly.packetId,
        },
      });
      
      // 发送异常事件
      this.eventEmitter.emit('anomaly.detected', anomaly);
      
      // 实时通知（WebSocket）
      if (this.server) {
        this.server.emit('anomaly', anomaly);
      }
    } catch (error) {
      console.error('存储异常记录失败:', error);
    }
  }

  // 生成流量统计信息
  private generateTrafficStats() {
    if (this.recentPackets.length === 0) {
      return {
        totalPackets: 0,
        packetsPerSecond: 0,
        averagePacketSize: 0,
        protocolDistribution: {},
        topSourceIps: [],
        topDestinationIps: [],
      };
    }

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    // 最近一分钟的数据包
    const recentMinutePackets = this.recentPackets.filter(
      packet => new Date(packet.timestamp) >= oneMinuteAgo
    );
    
    // 计算每秒包数
    const packetsPerSecond = recentMinutePackets.length / 60;
    
    // 计算平均包大小
    const totalSize = this.recentPackets.reduce((sum, packet) => sum + packet.length, 0);
    const averagePacketSize = totalSize / this.recentPackets.length;
    
    // 统计协议分布
    const protocolDistribution = {};
    for (const packet of this.recentPackets) {
      protocolDistribution[packet.protocol] = (protocolDistribution[packet.protocol] || 0) + 1;
    }
    
    // 统计源IP和目标IP
    const sourceIpCounts = {};
    const destIpCounts = {};
    
    for (const packet of this.recentPackets) {
      sourceIpCounts[packet.sourceIp] = (sourceIpCounts[packet.sourceIp] || 0) + 1;
      destIpCounts[packet.destinationIp] = (destIpCounts[packet.destinationIp] || 0) + 1;
    }
    
    // 获取前5名的源IP和目标IP
    const topSourceIps = Object.entries(sourceIpCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));
    
    const topDestinationIps = Object.entries(destIpCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));
    
    return {
      totalPackets: this.recentPackets.length,
      packetsPerSecond,
      averagePacketSize,
      protocolDistribution,
      topSourceIps,
      topDestinationIps,
    };
  }

  // 训练模型
  async trainModel() {
    return { status: '模型训练接口已迁移至Python服务', message: '请使用Python服务的模型训练接口' };
  }

  // 获取模型信息
  async getModelInfo() {
    return this.pythonService.getModelInfo();
  }

  // 获取所有异常记录
  async getAllAnomalies() {
    return this.prisma.anomaly.findMany({
      orderBy: { timestamp: 'desc' },
      include: { packet: true },
    });
  }

  // 获取流量统计信息
  async getTrafficStats() {
    return this.generateTrafficStats();
  }

  // 按条件分析流量
  async analyzeTrafficByCondition(condition: any) {
    // 从数据库中查询满足条件的数据包
    const packets = await this.prisma.packet.findMany({
      where: condition,
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });
    
    // 使用Python服务分析这些数据包
    return this.analyzePackets(packets);
  }

  // 分析指定的数据包
  private async analyzePackets(packets: any[]) {
    if (!this.pythonServiceAvailable || packets.length === 0) {
      return {
        status: 'error',
        message: 'Python分析服务不可用或没有数据',
      };
    }

    try {
      // 准备数据包特征
      const packetFeatures = packets.map(packet => ({
        id: packet.id,
        length: packet.length,
        sourcePort: packet.sourcePort,
        destinationPort: packet.destinationPort,
        protocol: packet.protocol,
        tcpFlags: packet.tcpFlags,
        sourceIp: packet.sourceIp,
        destinationIp: packet.destinationIp,
        timestamp: packet.timestamp
      }));

      // 使用Python服务进行特征提取
      const featuresResult = await this.pythonService.extractFeatures(packetFeatures);
      
      // 检测异常
      const anomalyResult = await this.pythonService.detectAnomalies(packetFeatures);
      
      // 进行攻击分类
      const classificationResult = await this.pythonService.classifyTraffic(packetFeatures);
      
      // 计算流量统计
      const stats = this.calculateStats(packets);
      
      return {
        status: 'success',
        features: featuresResult.features,
        anomalies: anomalyResult.anomalies,
        classifications: classificationResult.classifications,
        statistics: stats,
      };
    } catch (error) {
      console.error('分析数据包失败:', error);
      return {
        status: 'error',
        message: `分析失败: ${error.message}`,
      };
    }
  }

  // 计算统计信息
  private calculateStats(packets: any[]) {
    if (packets.length === 0) return {};
    
    const protocolDistribution = {};
    let totalSize = 0;
    const sourceIps = new Set();
    const destinationIps = new Set();
    const sourcePorts = new Set();
    const destinationPorts = new Set();
    
    for (const packet of packets) {
      protocolDistribution[packet.protocol] = (protocolDistribution[packet.protocol] || 0) + 1;
      totalSize += packet.length;
      sourceIps.add(packet.sourceIp);
      destinationIps.add(packet.destinationIp);
      sourcePorts.add(packet.sourcePort);
      destinationPorts.add(packet.destinationPort);
    }
    
    // 计算时间范围
    const timestamps = packets.map(p => new Date(p.timestamp).getTime());
    const minTime = new Date(Math.min(...timestamps));
    const maxTime = new Date(Math.max(...timestamps));
    const durationMs = maxTime.getTime() - minTime.getTime();
    const durationSeconds = durationMs / 1000;
    
    // 计算包率
    const packetsPerSecond = durationSeconds > 0 ? packets.length / durationSeconds : 0;
    
    return {
      totalPackets: packets.length,
      averageSize: totalSize / packets.length,
      packetsPerSecond: packetsPerSecond.toFixed(2),
      protocolDistribution,
      uniqueSourceIps: sourceIps.size,
      uniqueDestinationIps: destinationIps.size,
      uniqueSourcePorts: sourcePorts.size,
      uniqueDestinationPorts: destinationPorts.size,
      timeRange: {
        start: minTime,
        end: maxTime,
        durationSeconds: durationSeconds.toFixed(2)
      }
    };
  }
}
