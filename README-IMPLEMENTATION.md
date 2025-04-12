# 网络流量监控系统 - 实现方案

## 架构概述

本系统基于NestJS框架，实现了网络流量的捕获、分析和展示功能。系统采用模块化设计，主要包括以下组件：

### 1. 捕获模块 (CaptureService)
- 使用tshark工具采集网络流量数据
- 解析流量数据并存入PostgreSQL数据库
- 支持实时采集和批量处理

### 2. 分析模块 (AnalysisService)
- 对捕获的流量数据进行实时分析
- 内置多种基于规则的异常检测算法（DDoS、端口扫描、SYN洪水等）
- 集成TensorFlow.js进行机器学习分析
- 检测到异常时存储并实时通知

### 3. TensorFlow服务 (TensorflowService)
- 基于TensorFlow.js的深度学习模型
- 实现自编码器用于异常检测
- 实现分类模型用于流量分类
- 支持模型训练和保存

### 4. 流量服务 (TrafficService)
- 提供API接口查询和分析流量数据
- 支持多种过滤条件和时间范围查询
- 提供统计数据和分析结果

## 实现细节

### 数据流转

1. CaptureService捕获网络流量并存入数据库
2. AnalysisService定期（每5秒）从数据库获取最新流量数据
3. 对流量数据执行多种检测算法，包括调用TensorflowService进行ML分析
4. 检测到的异常存入数据库，并通过WebSocket实时推送给前端
5. 前端通过API查询流量数据和分析结果

### 机器学习集成

TensorflowService实现了两种模型：

1. **异常检测模型**：
   - 使用自编码器神经网络结构
   - 通过重构误差识别异常流量
   - 不需要标记数据，可以进行无监督学习

2. **流量分类模型**：
   - 多层神经网络分类器
   - 可将流量分为正常、DDoS攻击、端口扫描等类别
   - 需要标记数据进行训练

### 数据存储

系统使用Prisma ORM与PostgreSQL数据库交互，主要数据模型包括：

- Packet - 存储原始流量数据
- Analysis - 存储分析结果
- Anomaly - 存储检测到的异常
- TrafficFeature - 存储特征数据

## 部署指南

### 安装依赖

```bash
pnpm install
```

### 配置数据库

1. 编辑.env文件，设置数据库连接

```
DATABASE_URL="postgresql://username:password@localhost:5432/network_monitoring"
```

2. 初始化数据库

```bash
pnpm prisma migrate dev
```

### 运行系统

```bash
pnpm start:dev
```

## API端点

- `GET /traffic/packets` - 获取流量数据
- `GET /traffic/stats` - 获取流量统计
- `GET /traffic/anomalies` - 获取检测到的异常
- `GET /analysis/model-info` - 获取ML模型信息
- `POST /analysis/train-model` - 训练ML模型

## WebSocket事件

- `traffic-analysis` - 实时流量分析结果
- `anomaly-detected` - 检测到新异常 