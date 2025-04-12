# 网络流量监控与分析系统开发文档

## 1. 项目概述

本系统旨在实现网络流量的实时捕获、分析与可视化，支持基础系统指标监控、异常检测与攻击识别。

系统采用分布式架构，后端由 NestJS 提供统一接口，数据存储使用 PostgreSQL，流量分析部分使用 Python + TensorFlow 实现，前端使用 React + ECharts 完成数据展示。

---

## 2. 系统架构

| 模块            | 技术栈                   | 职责                              |
|-----------------|---------------------------|-----------------------------------|
| 后端服务        | NestJS + TypeScript       | 提供统一 API，捕获流量，调度分析，存储与查询数据 |
| 数据库服务      | PostgreSQL + Prisma ORM   | 存储原始流量、特征、分析结果、异常记录 |
| 捕获模块        | tshark                    | 实时捕获网络流量，保存原始数据     |
| 分析模块        | Python + TensorFlow + FastAPI | 提取特征，分析流量行为，检测异常和攻击 |
| 前端展示        | React + TypeScript + ECharts | 可视化流量数据，异常预警与分析报告 |

---

## 3. 当前进度

### ✅ 已完成

- **系统监控模块**：
  - CPU、内存、磁盘、网络等指标通过 Prometheus 采集。
  - 提供聚合接口，便于前端调用。

- **数据库模块**：
  - 数据结构设计完成，包含：Packet、TrafficFeature、Analysis、Anomaly 四张表。
  - Prisma 完成数据库对接。

- **流量捕获模块**：
  - 使用 `tshark` 实现流量捕获。
  - 支持捕获结果写入 tmp，解析后存入数据库。

- **流量分析模块**：
  - 完成基本框架，支持特征提取。
  - 已对接Python子程序，进行模型推理，预测异常与攻击行为。

- **流量展示模块**：
  - 提供统计与时间段查询接口。
  - 异常检测结果可视化。

---

## 4. 分析架构调整

### ⚡ 最新方案

- 机器学习完全由 Python + TensorFlow 完成，包括特征提取、模型训练及预测；
- NestJS 作为控制层，通过 HTTP API 调用 Python 服务，接收分析结果；
- 使用 FastAPI 构建 Python 微服务，提供稳定的模型推理接口；
- 支持加载已训练好的 `.h5` 或 `.pb` 格式模型文件，便于模型更新与部署。

---

## 5. 模块划分

### 📂 项目结构

```
src/
  ├── capture/           # 流量捕获模块（调用tshark，存储数据库）
  ├── analysis/          # 流量分析模块（调用Python进行特征提取与预测）
  ├── traffic/           # 流量展示模块（统计、查询、异常展示）
  ├── metrics/           # 系统指标监控模块
  ├── prisma/            # 数据库访问服务
  └── config/            # 配置文件
```

```
ml_service/              # Python模型服务
  ├── app/               # FastAPI应用
  │   ├── routes/        # API路由
  │   ├── models/        # 数据模型
  │   └── services/      # 特征提取与模型推理服务
  ├── models/            # 预训练模型文件 (.h5/.pb)
  ├── utils/             # 工具函数
  ├── scripts/           # 模型训练/特征处理脚本
  └── requirements.txt   # Python依赖
```

---

## 6. 数据流说明

1️⃣ `capture`模块调用`tshark`，捕获数据并存入数据库。

2️⃣ `analysis`模块：
   - 从数据库读取数据，通过HTTP API传输到Python服务。
   - Python服务完成特征提取和模型推理，返回预测结果。
   - NestJS将结果存储并通过WebSocket推送给前端。

3️⃣ `traffic`模块：
   - 提供前端查询接口，支持历史数据查询、异常列表、统计图表展示。

4️⃣ `metrics`模块：
   - 通过Prometheus采集并提供系统运行指标，前端展示。

---

## 7. 技术栈

- **后端服务**
  - NestJS + TypeScript
  - PostgreSQL + Prisma ORM
  - tshark (流量捕获)

- **Python分析服务**
  - FastAPI
  - TensorFlow / Keras
  - Scikit-learn (特征处理)
  - Pandas (数据处理)

- **前端服务**
  - React / Vue + TypeScript
  - ECharts / D3.js (可视化)
  - WebSocket + Socket.io
  - Ant Design / Element UI

---

## 8. 部署规划

- 使用Docker Compose统一管理：NestJS / Python服务 / PostgreSQL
- 服务间通过 REST API 通信
- 使用Nginx实现统一网关
- 监控服务健康状态，日志集中收集

---

## 9. 待办事项

- [ ] 构建Python模型服务，实现FastAPI接口
- [ ] 完善特征提取与模型加载逻辑
- [ ] 更新`analysis.service.ts`调用方式，移除TensorFlow.js相关代码
- [ ] `capture`模块添加过滤规则，支持更灵活的抓包策略
- [ ] 前端完善异常告警与流量统计图表
- [ ] 实现系统配置管理与用户权限控制

---

✅ 更新至：2025-04-15

如有需求变动，请及时同步更新！