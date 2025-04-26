# 网络监控系统 - 日志模块

## 功能概述

日志模块是网络监控系统的核心组成部分，负责记录、展示和分析系统运行过程中的各种事件和数据。通过日志模块，用户可以实时监控系统状态，排查问题，分析历史趋势，并设置告警机制。

## 主要功能

### 前端功能

#### 1. 日志概览仪表盘
- **总日志统计**: 显示系统中所有日志的总数
- **错误日志统计**: 展示系统中的错误日志数量
- **警告日志统计**: 展示系统中的警告日志数量
- **实时监控开关**: 控制是否启用自动轮询获取最新日志

#### 2. 日志统计图表
- **概览标签**: 系统日志整体情况展示
- **类型分布标签**: 饼图展示不同类型日志的占比
- **来源分布标签**: 柱状图展示不同来源日志的数量
- **时间趋势标签**: 折线图展示日志数量随时间的变化趋势

#### 3. 日志列表
- **搜索功能**: 支持关键词搜索日志内容
- **类型过滤**: 可按日志类型（错误、警告、信息等）筛选
- **来源过滤**: 可按日志来源（系统、API、数据库等）筛选
- **分页导航**: 分页展示大量日志数据
- **日志详情**: 显示时间、级别、来源、消息等信息

#### 4. 日志管理
- **刷新功能**: 手动刷新日志数据
- **导出功能**: 支持CSV和JSON格式导出日志
- **清空功能**: 清除所有日志记录（带确认对话框）
- **自动轮询**: 定时自动更新日志数据

#### 5. 告警系统
- **系统指标监控**: 监控CPU、内存、磁盘、网络、系统等指标
- **阈值告警**: 超过预设阈值自动记录告警日志
- **告警抑制**: 相同告警间隔时间控制

### 后端接口

#### 1. 获取日志列表
```
GET /logs
```

**参数**:
- `limit`: 每页记录数 (默认50)
- `offset`: 分页偏移量
- `type`: 日志类型过滤
- `source`: 日志来源过滤
- `search`: 搜索关键词
- `startTime`: 开始时间
- `endTime`: 结束时间

**响应**:
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "timestamp": "2025-04-26T19:52:08.827Z",
      "logType": "SYSTEM_START",
      "source": "system",
      "message": "系统启动成功，监听端口: 5000",
      "metadata": null,
      "createdAt": "2025-04-26T19:52:08.827Z",
      "updatedAt": "2025-04-26T19:52:08.827Z"
    },
    // ...更多日志
  ],
  "total": 100,
  "message": "成功"
}
```

#### 2. 获取日志类型统计
```
GET /logs/type-stats
```

**参数**:
- `startTime`: 开始时间
- `endTime`: 结束时间

**响应**:
```json
{
  "code": 0,
  "data": [
    {
      "type": "ERROR",
      "count": 25,
      "percentage": 15.2
    },
    {
      "type": "WARNING",
      "count": 45,
      "percentage": 27.3
    },
    // ...其他类型
  ],
  "message": "成功"
}
```

#### 3. 获取日志来源统计
```
GET /logs/source-stats
```

**参数**:
- `startTime`: 开始时间
- `endTime`: 结束时间

**响应**:
```json
{
  "code": 0,
  "data": [
    {
      "source": "database",
      "count": 30,
      "percentage": 18.2
    },
    {
      "source": "api",
      "count": 65,
      "percentage": 39.4
    },
    // ...其他来源
  ],
  "message": "成功"
}
```

#### 4. 获取日志时间趋势
```
GET /logs/time-stats
```

**参数**:
- `startTime`: 开始时间
- `endTime`: 结束时间
- `interval`: 时间间隔 (hour, day, week)

**响应**:
```json
{
  "code": 0,
  "data": [
    {
      "time": "2025-04-26T18:00:00Z",
      "errorCount": 5,
      "warningCount": 8,
      "infoCount": 15,
      "apiCount": 12,
      "systemCount": 3,
      "totalCount": 43
    },
    // ...更多时间点
  ],
  "message": "成功"
}
```

#### 5. 创建日志
```
POST /logs
```

**请求体**:
```json
{
  "logType": "WARNING",
  "source": "monitoring",
  "message": "监控指标超过阈值: CPU使用率",
  "metadata": {
    "metric": "CPU使用率",
    "value": 85,
    "threshold": 80,
    "timestamp": "2025-04-26T19:55:00Z"
  }
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": 6,
    "timestamp": "2025-04-26T19:55:00Z",
    "logType": "WARNING",
    "source": "monitoring",
    "message": "监控指标超过阈值: CPU使用率",
    "metadata": {
      "metric": "CPU使用率",
      "value": 85,
      "threshold": 80,
      "timestamp": "2025-04-26T19:55:00Z"
    },
    "createdAt": "2025-04-26T19:55:00Z",
    "updatedAt": "2025-04-26T19:55:00Z"
  },
  "message": "成功"
}
```

#### 6. 清除日志
```
DELETE /logs
```

**响应**:
```json
{
  "code": 0,
  "data": null,
  "message": "日志清除成功"
}
```

#### 7. 导出日志
```
GET /logs/export/{format}
```

**参数**:
- `format`: 导出格式 (csv 或 json)
- 其他过滤参数与 GET /logs 相同

**响应**: 二进制文件流

## 日志类型定义

```typescript
export enum LogType {
  SYSTEM_START = 'SYSTEM_START',
  SYSTEM_STOP = 'SYSTEM_STOP',
  API_ACCESS = 'API_ACCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}
```

## 日志来源定义

```typescript
export enum LogSource {
  SYSTEM = 'system',
  API = 'api',
  DATABASE = 'database',
  AUTH = 'auth',
  NETWORK = 'network',
  SCHEDULER = 'scheduler',
  FRONTEND = 'frontend',
  CACHE = 'cache',
  MONITORING = 'monitoring'
}
```

## 监控阈值配置

系统预设了多种阈值用于监控告警：

### CPU阈值
- 使用率警告：80%
- 使用率危险：90%
- 队列长度警告：5
- 队列长度危险：10

### 内存阈值
- 使用率警告：80%
- 使用率危险：90%
- 提交百分比警告：85%

### 磁盘阈值
- 使用率警告：85%
- 使用率危险：95%
- I/O警告：80MB/s
- I/O危险：100MB/s

### 网络阈值
- 带宽使用率警告：70%
- 带宽使用率危险：90%
- 流量警告：100MB/s
- 错误率警告：1%

### 系统阈值
- 进程数警告：500
- 线程数警告：5000
- 停止服务数警告：5

## 使用监控告警

使用`useMonitoringAlerts`钩子可以自动检测系统指标并发送告警日志：

```tsx
const { enabledAlerts } = useMonitoringAlerts({
  cpu: true,
  memory: true,
  disk: true,
  network: true,
  system: true
}, 30000); // 30秒检查一次
```

## 监控指标日志记录

系统提供了便捷的监控指标日志记录方法：

```typescript
// 记录CPU使用率超阈值
monitoringLogs.cpuUsage(85, 80);

// 记录内存使用率超阈值
monitoringLogs.memoryUsage(92, 90);

// 记录磁盘使用率超阈值
monitoringLogs.diskUsage(88, 85);

// 记录网络流量超阈值
monitoringLogs.networkTraffic(120, 100);
```

## 前端日志记录

记录前端错误：

```typescript
try {
  // 可能出错的代码
} catch (error) {
  logFrontendError(error, "UserDashboard");
}
```

## 日志组件使用

系统日志组件在SystemLogs.tsx中实现，主要包括：

1. 顶部卡片展示日志统计信息和实时监控控制
2. 中部标签页显示各种统计图表
3. 底部列表显示详细日志记录，支持搜索、过滤和分页
4. 额外操作：刷新、导出、清空日志

组件使用示例：

```tsx
import { SystemLogs } from "@/pages/SystemLogs";

export default function LogsPage() {
  return (
    <div>
      <h1>系统日志</h1>
      <SystemLogs />
    </div>
  );
}
```

## 注意事项

1. 日志记录应避免循环调用，特别是在错误处理中
2. 实时监控功能会增加服务器负载，建议在需要时开启
3. 大量日志导出可能需要较长时间，建议使用过滤条件减少数据量
4. 监控阈值可以根据实际系统性能进行调整 