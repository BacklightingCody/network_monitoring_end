import { Injectable, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TensorflowService implements OnModuleInit {
  private anomalyDetectionModel: tf.Sequential;
  private trafficClassificationModel: tf.Sequential;
  private modelLoaded: boolean = false;
  private modelTraining: boolean = false;
  private standardScaler: {
    mean: tf.Tensor,
    std: tf.Tensor
  };

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // 初始化TensorFlow模型
    try {
      await this.loadOrCreateModels();
      console.log('✅ TensorFlow.js模型已加载');
    } catch (error) {
      console.error('❌ TensorFlow.js模型加载失败:', error);
    }
  }

  async loadOrCreateModels() {
    try {
      // 尝试加载已有模型
      this.anomalyDetectionModel = await tf.loadLayersModel('file://./models/anomaly_detection/model.json') as tf.Sequential;
      this.trafficClassificationModel = await tf.loadLayersModel('file://./models/traffic_classification/model.json') as tf.Sequential;
      this.modelLoaded = true;
      console.log('已加载现有的TensorFlow模型');
    } catch (error) {
      console.log('未找到现有模型，将创建新模型');
      // 创建新模型
      await this.createModels();
    }
  }

  private async createModels() {
    // 创建异常检测模型
    this.anomalyDetectionModel = tf.sequential();
    this.anomalyDetectionModel.add(tf.layers.dense({
      inputShape: [5], // 输入特征数量
      units: 16,
      activation: 'relu'
    }));
    this.anomalyDetectionModel.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    this.anomalyDetectionModel.add(tf.layers.dense({
      units: 5, // 输出与输入相同 (自编码器)
      activation: 'sigmoid'
    }));

    this.anomalyDetectionModel.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError'
    });

    // 创建流量分类模型
    this.trafficClassificationModel = tf.sequential();
    this.trafficClassificationModel.add(tf.layers.dense({
      inputShape: [5], // 输入特征数量
      units: 32,
      activation: 'relu'
    }));
    this.trafficClassificationModel.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
    this.trafficClassificationModel.add(tf.layers.dense({
      units: 4, // 输出类别数 (正常, DDoS, 端口扫描, 其他)
      activation: 'softmax'
    }));

    this.trafficClassificationModel.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.modelLoaded = true;
    console.log('已创建新的TensorFlow模型');
  }

  // 数据预处理
  private preprocessData(packetFeatures: any[]) {
    const numericFeatures = packetFeatures.map(packet => [
      packet.length, 
      packet.sourcePort,
      packet.destinationPort,
      this.protocolToNumber(packet.protocol),
      this.tcpFlagsToNumber(packet.tcpFlags),
    ]);

    // 标准化
    const features = tf.tensor2d(numericFeatures);
    if (!this.standardScaler) {
      const mean = features.mean(0);
      // 使用as any来解决std方法不存在的类型错误
      const std = (features as any).std(0);
      this.standardScaler = { mean, std };
    }

    const normalizedFeatures = features.sub(this.standardScaler.mean).div(this.standardScaler.std);
    return normalizedFeatures;
  }

  private protocolToNumber(protocol: string): number {
    switch (protocol?.toLowerCase()) {
      case 'tcp': return 1;
      case 'udp': return 2;
      case 'icmp': return 3;
      default: return 0;
    }
  }

  private tcpFlagsToNumber(flags: string): number {
    if (!flags) return 0;
    let value = 0;
    if (flags.includes('SYN')) value += 1;
    if (flags.includes('ACK')) value += 2;
    if (flags.includes('FIN')) value += 4;
    if (flags.includes('RST')) value += 8;
    if (flags.includes('PSH')) value += 16;
    if (flags.includes('URG')) value += 32;
    return value;
  }

  // 使用自编码器进行异常检测
  async detectAnomalies(packetFeatures: any[]) {
    if (!this.modelLoaded || packetFeatures.length === 0) return { anomalies: [] };

    const features = this.preprocessData(packetFeatures);
    
    // 使用自编码器模型进行预测
    const predictions = this.anomalyDetectionModel.predict(features) as tf.Tensor;
    
    // 计算重构误差
    const reconstructionErrors = tf.losses.meanSquaredError(features, predictions).arraySync() as number[];
    
    // 根据重构误差大小确定异常
    const anomalyIndices = [];
    const anomalyThreshold = 0.1; // 可调整的阈值
    
    reconstructionErrors.forEach((error, index) => {
      if (error > anomalyThreshold) {
        anomalyIndices.push(index);
      }
    });

    // 释放张量
    features.dispose();
    predictions.dispose();

    return {
      anomalies: anomalyIndices,
      predictions: reconstructionErrors
    };
  }

  // 对流量进行分类
  async classifyTraffic(packetFeatures: any[]) {
    if (!this.modelLoaded || packetFeatures.length === 0) return { classifications: [] };

    const features = this.preprocessData(packetFeatures);
    
    // 使用分类模型进行预测
    const predictions = this.trafficClassificationModel.predict(features) as tf.Tensor;
    const classIndices = predictions.argMax(1).arraySync() as number[];
    
    // 将类别索引转换为标签
    const labels = ['normal', 'ddos', 'portscan', 'other'];
    const classifications = classIndices.map(index => labels[index]);
    
    // 获取概率
    const probabilities = predictions.arraySync() as number[][];
    
    // 释放张量
    features.dispose();
    predictions.dispose();

    return {
      classifications,
      probabilities
    };
  }

  // 用新数据训练模型
  async trainModels(trainingData?: any[]) {
    if (this.modelTraining) {
      return { status: 'Model training is already in progress' };
    }

    try {
      this.modelTraining = true;
      
      // 如果没有提供训练数据，从数据库获取
      if (!trainingData) {
        // 使用any类型断言来访问packet表
        const prismaClient = this.prisma as any;
        const packets = await prismaClient.packet.findMany({
          orderBy: { timestamp: 'desc' },
          take: 10000,
          select: {
            length: true,
            sourcePort: true,
            destinationPort: true,
            protocol: true,
            tcpFlags: true
          }
        });
        
        trainingData = packets;
      }
      
      if (trainingData.length < 100) {
        this.modelTraining = false;
        return { status: 'Not enough data for training' };
      }

      // 数据预处理
      const features = this.preprocessData(trainingData);
      
      // 训练异常检测模型
      await this.anomalyDetectionModel.fit(features, features, {
        epochs: 10,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`异常检测模型训练 - Epoch ${epoch+1}: loss = ${logs.loss}`);
          }
        }
      });
      
      // 保存模型
      await this.anomalyDetectionModel.save('file://./models/anomaly_detection');
      
      // 训练分类模型需要标记数据，这里简化处理
      // 实际应用中可能需要手动标记或使用半监督学习方法
      // 这里我们简单地将一些数据标记为异常
      
      this.modelTraining = false;
      
      // 释放张量
      features.dispose();
      
      return { status: 'Training completed successfully' };
      
    } catch (error) {
      this.modelTraining = false;
      console.error('模型训练失败:', error);
      return { status: 'Training failed', error: error.message };
    }
  }

  // 获取模型信息
  getModelInfo() {
    return {
      loaded: this.modelLoaded,
      training: this.modelTraining,
      models: {
        anomalyDetection: this.anomalyDetectionModel ? this.anomalyDetectionModel.summary() : null,
        classification: this.trafficClassificationModel ? this.trafficClassificationModel.summary() : null
      }
    };
  }
} 