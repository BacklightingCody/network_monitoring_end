# 网络监控系统 - 日志功能文档

## 概述

日志系统是网络监控系统的核心组件之一，用于记录系统的各种运行状态、操作行为和异常情况。通过完善的日志记录，我们可以：

- 追踪系统启动和关闭过程
- 监控API访问情况
- 记录系统错误和异常
- 分析系统性能和使用情况
- 排查故障和安全问题

## 日志类型

系统支持以下几种日志类型：

| 日志类型 | 描述 | 使用场景 |
|---------|------|----------|
| SYSTEM_START | 系统启动日志 | 记录系统启动时间、环境和端口等信息 |
| SYSTEM_STOP | 系统关闭日志 | 记录系统正常或异常关闭的情况 |
| API_ACCESS | API访问日志 | 记录所有API请求的路径、方法和来源IP等 |
| ERROR | 错误日志 | 记录系统运行中的错误和异常情况 |
| WARNING | 警告日志 | 记录潜在的问题或需要注意的情况 |
| INFO | 信息日志 | 记录一般性的系统信息 |

## 数据模型

日志数据存储在PostgreSQL数据库的`SystemLog`表中，模型定义如下：

```prisma
// 系统日志表
model SystemLog {
  id          Int      @id @default(autoincrement())
  timestamp   DateTime @default(now())
  logType     String   // SYSTEM_START, SYSTEM_STOP, API_ACCESS, ERROR, WARNING 等
  source      String   // 日志来源模块
  message     String   // 日志消息
  metadata    Json?    // 附加信息
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## 服务接口

### LogsService

`LogsService`提供了一系列方法用于记录不同类型的日志和检索日志信息：

#### 记录日志方法

```typescript
// 通用日志记录方法
async log(type: LogType, source: string, message: string, options?: LogOptions)

// 记录系统启动
async logSystemStart(message: string, options?: LogOptions)

// 记录系统关闭
async logSystemStop(message: string, options?: LogOptions)

// 记录API访问
async logApiAccess(endpoint: string, method: string, options?: LogOptions)

// 记录错误信息
async logError(source: string, message: string, error?: Error, options?: LogOptions)

// 记录警告信息
async logWarning(source: string, message: string, options?: LogOptions)

// 记录一般信息
async logInfo(source: string, message: string, options?: LogOptions)
```

#### 查询和管理方法

```typescript
// 获取所有日志，支持分页和类型过滤
async getAllLogs(limit = 100, offset = 0, type?: LogType)

// 清除所有日志
async clearLogs()
```

### LogOptions接口

```typescript
export interface LogOptions {
  metadata?: any; // 可选的附加数据，会被转换为JSON存储
}
```

## API接口

系统提供了以下REST API用于查询和管理日志：

### 获取日志列表

```
GET /logs
```

**查询参数：**

- `limit` (可选): 返回的日志数量，默认100
- `offset` (可选): 分页偏移量，默认0
- `type` (可选): 日志类型过滤，必须是LogType枚举值之一

**响应示例：**

```json
[
  {
    "id": 1,
    "timestamp": "2023-06-01T12:00:00Z",
    "logType": "SYSTEM_START",
    "source": "system",
    "message": "系统启动成功，监听端口: 5000",
    "metadata": null,
    "createdAt": "2023-06-01T12:00:00Z",
    "updatedAt": "2023-06-01T12:00:00Z"
  },
  {
    "id": 2,
    "timestamp": "2023-06-01T12:01:00Z",
    "logType": "API_ACCESS",
    "source": "api",
    "message": "GET /devices",
    "metadata": {
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "duration": 15
    },
    "createdAt": "2023-06-01T12:01:00Z",
    "updatedAt": "2023-06-01T12:01:00Z"
  }
]
```

### 清除所有日志

```
DELETE /logs
```

**响应：**

操作成功返回HTTP状态码204 (No Content)。

## 中间件功能

系统使用`LoggingMiddleware`中间件自动记录所有API访问。中间件会：

1. 记录每个请求的开始时间、请求方法、路径和来源IP
2. 对非GET请求记录请求体内容
3. 记录请求处理时间
4. 当响应状态码大于等于400时，自动记录为警告日志

## 示例用法

### 记录系统启动

```typescript
// 在main.ts中
const app = await NestFactory.create(AppModule);
const logsService = app.get(LogsService);
await logsService.logSystemStart(`系统启动成功，监听端口: ${PORT}`);
```

### 记录错误

```typescript
try {
  // 某些可能抛出异常的操作
} catch (error) {
  this.logsService.logError('devices', '获取设备列表失败', error);
}
```

### 记录自定义信息

```typescript
this.logsService.logInfo('capture', `开始捕获流量，接口: ${interfaceName}`);
```

### 查询特定类型的日志

```typescript
// 只获取错误日志
const errorLogs = await this.logsService.getAllLogs(100, 0, LogType.ERROR);
```

## 日志最佳实践

1. **使用适当的日志级别**：根据信息的重要性和紧急程度选择合适的日志类型
2. **记录关键节点**：在系统关键操作前后记录日志，如启动服务、处理重要请求等
3. **结构化日志信息**：使用metadata字段存储额外的结构化信息，便于后续分析
4. **异常捕获**：在try/catch块中使用logError方法，确保异常信息被完整记录
5. **定期清理**：定期清理或归档旧日志，避免数据库表过大影响性能

## 扩展建议

1. 实现日志旋转机制，定期归档或清理旧日志
2. 添加日志导出功能，支持CSV或JSON格式导出
3. 开发日志分析模块，提供图表和统计分析
4. 添加日志搜索功能，支持关键词和日期范围搜索
5. 集成监控系统，当出现大量错误日志时自动报警

## 安全注意事项

1. 敏感信息（如密码、令牌、个人身份信息）不应直接记录到日志中
2. 限制日志API的访问权限，只允许授权用户查看日志
3. 考虑对日志数据进行加密或脱敏处理
4. 日志记录应符合相关的数据保护法规要求（如GDPR） 