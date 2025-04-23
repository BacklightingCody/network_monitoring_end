# 网络流量监控 API 文档

本文档详细说明了网络流量监控系统的API接口。

## 基础信息

- **基础URL**: `/traffic`
- **响应格式**: JSON
- **认证**: 暂无认证要求

## 通用参数

许多接口接受以下通用参数：

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| startTime | ISO日期字符串 | 查询的开始时间 | 视具体接口而定 |
| endTime | ISO日期字符串 | 查询的结束时间 | 当前时间 |
| limit | 整数 | 结果条目数量限制 | 视具体接口而定 |

## 接口列表

### 1. 获取完整流量统计数据

一个聚合接口，返回系统中几乎所有的流量统计数据，减少前端请求次数。

**请求**:
```
GET /traffic/all
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| startTime | ISO日期字符串 | 查询的开始时间 | 24小时前 |
| endTime | ISO日期字符串 | 查询的结束时间 | 当前时间 |
| interval | 字符串 | 时间间隔（如"5m", "1h"） | "5m" |
| limit | 整数 | 各类列表限制数量 | 10 |
| includeRealtime | 布尔字符串 | 是否包含实时流量数据 | "true" |
| includeTrafficTrend | 布尔字符串 | 是否包含流量趋势数据 | "true" |
| includePackets | 布尔字符串 | 是否包含最近数据包信息 | "false" |
| days | 整数 | 流量趋势数据天数 | 7 |

**响应**:
```json
{
  "summary": {
    "totalPackets": 12345,
    "lastCaptureTime": "2023-05-20T14:30:00Z",
    "lastHourTraffic": 567,
    "anomalyCount": 5,
    "timeRange": {
      "start": "2023-05-19T14:30:00Z",
      "end": "2023-05-20T14:30:00Z"
    }
  },
  "basicStats": {
    "count": 12345,
    "totalBytes": 123456789,
    "avgSize": 1000,
    "protocols": {
      "TCP": 9876,
      "UDP": 2345,
      "ICMP": 124
    },
    "sourceIPs": [
      {"item": "192.168.1.1", "count": 1234},
      {"item": "10.0.0.1", "count": 567}
    ],
    "destIPs": [
      {"item": "8.8.8.8", "count": 987},
      {"item": "1.1.1.1", "count": 654}
    ],
    "timeRange": {
      "start": "2023-05-19T14:30:00Z",
      "end": "2023-05-20T14:30:00Z"
    }
  },
  "topSources": [
    {"ip": "192.168.1.1", "count": 1234},
    {"ip": "10.0.0.1", "count": 567}
  ],
  "topDestinations": [
    {"ip": "8.8.8.8", "count": 987},
    {"ip": "1.1.1.1", "count": 654}
  ],
  "protocolStats": [
    {
      "protocol": "TCP",
      "count": 9876,
      "percentage": 80
    },
    {
      "protocol": "UDP", 
      "count": 2345,
      "percentage": 19
    }
  ],
  "activeConnections": [
    {
      "sourceIp": "192.168.1.1",
      "sourcePort": 54321,
      "destinationIp": "8.8.8.8",
      "destinationPort": 443,
      "protocol": "TCP",
      "count": 876,
      "lastSeen": "2023-05-20T14:29:50Z"
    }
  ],
  "communicationPairs": [
    {
      "sourceIp": "192.168.1.1",
      "destinationIp": "8.8.8.8",
      "packetCount": 987,
      "totalBytes": 123456,
      "protocolStats": [
        {"protocol": "TCP", "count": 900, "percentage": 91.2}
      ]
    }
  ],
  "packetSizes": [
    {
      "min": 64,
      "max": 128,
      "label": "64-128 bytes",
      "count": 5432,
      "percentage": 44
    }
  ],
  "applications": [
    {
      "name": "HTTPS",
      "packetCount": 8765,
      "byteCount": 9876543,
      "ports": [443, 8443],
      "percentage": 71
    }
  ],
  "portUsage": [
    {
      "port": 443,
      "protocol": "TCP",
      "direction": "destination",
      "count": 8765,
      "service": "HTTPS"
    }
  ],
  "geoDistribution": {
    "domestic": {
      "count": 8000,
      "percentage": 65,
      "regions": [
        {"name": "北京", "count": 1850, "percentage": 15}
      ]
    },
    "international": {
      "count": 4345,
      "percentage": 35,
      "countries": [
        {"name": "美国", "count": 1850, "percentage": 15}
      ]
    }
  },
  "anomalies": [
    {
      "id": 1,
      "timestamp": "2023-05-20T14:25:30Z",
      "type": "portscan",
      "severity": "high",
      "description": "端口扫描检测",
      "packetId": 12345
    }
  ],
  "realtimeTraffic": {
    "summary": {
      "totalPackets": 543,
      "totalBytes": 654321,
      "avgPacketsPerSecond": 1.8,
      "avgBytesPerSecond": 2181,
      "duration": 300
    },
    "timePoints": [
      {
        "timestamp": "2023-05-20T14:29:00Z",
        "packetCount": 30,
        "byteCount": 34567,
        "packetsPerSecond": 3,
        "bytesPerSecond": 3456,
        "protocols": {
          "TCP": 25,
          "UDP": 5
        }
      }
    ]
  },
  "trafficTrend": {
    "packets": [
      {
        "time": "2023-05-20T13:00:00Z",
        "packets": 543,
        "bytes": 654321
      }
    ],
    "bytes": [
      {
        "time": "2023-05-20T13:00:00Z",
        "packets": 543,
        "bytes": 654321
      }
    ]
  },
  "recentPackets": {
    "total": 12345,
    "page": 1,
    "limit": 100,
    "packets": [
      {
        "id": 12345,
        "timestamp": "2023-05-20T14:29:50Z",
        "sourceIp": "192.168.1.1",
        "destinationIp": "8.8.8.8",
        "protocol": "TCP",
        "sourcePort": 54321,
        "destinationPort": 443,
        "length": 1024
      }
    ]
  }
}
```

### 2. 获取数据包列表

获取网络数据包列表，支持分页和筛选。

**请求**:
```
GET /traffic/packets
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| page | 整数 | 页码 | 1 |
| limit | 整数 | 每页条目数 | 10 |
| sourceIp | 字符串 | 源IP地址过滤 | - |
| destinationIp | 字符串 | 目标IP地址过滤 | - |
| protocol | 字符串 | 协议过滤 | - |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
{
  "total": 12345,
  "page": 1,
  "limit": 10,
  "packets": [
    {
      "id": 1,
      "timestamp": "2023-05-20T14:29:50Z",
      "sourceIp": "192.168.1.1",
      "destinationIp": "8.8.8.8",
      "protocol": "TCP",
      "sourcePort": 54321,
      "destinationPort": 443,
      "length": 1024
    }
  ]
}
```

### 3. 获取流量统计

获取基本流量统计数据。

**请求**:
```
GET /traffic/stats
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |
| interval | 字符串 | 时间间隔（如"5m", "1h"） | "5m" |

**响应**:
```json
{
  "count": 12345,
  "totalBytes": 123456789,
  "avgSize": 1000,
  "protocols": {
    "TCP": 9876,
    "UDP": 2345,
    "ICMP": 124
  },
  "sourceIPs": [
    {"item": "192.168.1.1", "count": 1234},
    {"item": "10.0.0.1", "count": 567}
  ],
  "destIPs": [
    {"item": "8.8.8.8", "count": 987},
    {"item": "1.1.1.1", "count": 654}
  ],
  "timeRange": {
    "start": "2023-05-19T14:30:00Z",
    "end": "2023-05-20T14:30:00Z"
  },
  "timeSeries": [
    {
      "time": "2023-05-20T14:00:00Z",
      "count": 567,
      "bytes": 678901
    }
  ]
}
```

### 4. 获取异常记录

获取流量异常记录列表。

**请求**:
```
GET /traffic/anomalies
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| limit | 整数 | 条目数量限制 | 20 |
| severity | 字符串 | 严重性过滤 | - |
| type | 字符串 | 异常类型过滤 | - |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
[
  {
    "id": 1,
    "timestamp": "2023-05-20T14:25:30Z",
    "type": "portscan",
    "severity": "high",
    "description": "端口扫描检测",
    "packetId": 12345,
    "packet": {
      "id": 12345,
      "sourceIp": "192.168.1.100",
      "destinationIp": "192.168.1.1"
    }
  }
]
```

### 5. 获取顶级源IP

获取流量最多的源IP地址。

**请求**:
```
GET /traffic/top-sources
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| limit | 整数 | 条目数量限制 | 10 |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
[
  {
    "ip": "192.168.1.1",
    "count": 1234
  },
  {
    "ip": "10.0.0.1",
    "count": 567
  }
]
```

### 6. 获取顶级目标IP

获取流量最多的目标IP地址。

**请求**:
```
GET /traffic/top-destinations
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| limit | 整数 | 条目数量限制 | 10 |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
[
  {
    "ip": "8.8.8.8",
    "count": 987
  },
  {
    "ip": "1.1.1.1",
    "count": 654
  }
]
```

### 7. 获取协议统计

获取协议使用统计。

**请求**:
```
GET /traffic/protocols
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
{
  "total": 12345,
  "stats": [
    {
      "protocol": "TCP",
      "count": 9876,
      "percentage": 80
    },
    {
      "protocol": "UDP", 
      "count": 2345,
      "percentage": 19
    }
  ]
}
```

### 8. 获取流量体积

获取时间序列的流量体积数据。

**请求**:
```
GET /traffic/traffic-volume
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| interval | 字符串 | 时间间隔（如"5m", "1h"） | "5m" |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
[
  {
    "time": "2023-05-20T14:00:00Z",
    "count": 567,
    "bytes": 678901
  },
  {
    "time": "2023-05-20T14:05:00Z",
    "count": 432,
    "bytes": 543210
  }
]
```

### 9. 分析特定数据包

分析单个数据包的详细信息。

**请求**:
```
GET /traffic/analyze/:id
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| id | 整数 | 数据包ID | 必填 |

**响应**:
```json
{
  "packet": {
    "id": 12345,
    "timestamp": "2023-05-20T14:29:50Z",
    "sourceIp": "192.168.1.1",
    "destinationIp": "8.8.8.8",
    "protocol": "TCP",
    "sourcePort": 54321,
    "destinationPort": 443,
    "length": 1024
  },
  "analysis": {
    "isMalicious": false,
    "confidence": 0.95,
    "features": {
      "hasUnusualPort": false,
      "isKnownBadIP": false
    }
  }
}
```

### 10. 获取活跃连接

获取当前活跃的网络连接。

**请求**:
```
GET /traffic/active-connections
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| limit | 整数 | 条目数量限制 | 20 |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
{
  "total": 456,
  "connections": [
    {
      "sourceIp": "192.168.1.1",
      "sourcePort": 54321,
      "destinationIp": "8.8.8.8",
      "destinationPort": 443,
      "protocol": "TCP",
      "count": 876,
      "lastSeen": "2023-05-20T14:29:50Z",
      "firstSeen": "2023-05-20T14:25:30Z"
    }
  ]
}
```

### 11. 获取端口使用情况

获取端口使用统计。

**请求**:
```
GET /traffic/port-usage
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| limit | 整数 | 条目数量限制 | 20 |
| direction | 字符串 | 方向过滤 ("source", "destination", "both") | "both" |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
{
  "total": 123,
  "ports": [
    {
      "port": 443,
      "protocol": "TCP",
      "direction": "destination",
      "count": 8765,
      "service": "HTTPS"
    }
  ]
}
```

### 12. 获取流量趋势

获取流量趋势数据。

**请求**:
```
GET /traffic/traffic-trend
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| interval | 字符串 | 时间间隔 ("hourly", "daily", "weekly") | "hourly" |
| metric | 字符串 | 指标类型 ("packets", "bytes") | "packets" |
| days | 整数 | 天数 | 7 |

**响应**:
```json
{
  "interval": "hourly",
  "metric": "packets",
  "data": [
    {
      "time": "2023-05-20T13:00:00Z",
      "packets": 543,
      "bytes": 654321
    }
  ]
}
```

### 13. 获取地理分布

获取流量的地理位置分布。

**请求**:
```
GET /traffic/geo-distribution
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
{
  "domestic": {
    "count": 8000,
    "percentage": 65,
    "regions": [
      {"name": "北京", "count": 1850, "percentage": 15},
      {"name": "上海", "count": 1480, "percentage": 12}
    ]
  },
  "international": {
    "count": 4345,
    "percentage": 35,
    "countries": [
      {"name": "美国", "count": 1850, "percentage": 15},
      {"name": "日本", "count": 615, "percentage": 5}
    ]
  }
}
```

### 14. 获取通信对

获取IP通信对统计。

**请求**:
```
GET /traffic/communication-pairs
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| limit | 整数 | 条目数量限制 | 20 |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
{
  "total": 234,
  "pairs": [
    {
      "sourceIp": "192.168.1.1",
      "destinationIp": "8.8.8.8",
      "packetCount": 987,
      "totalBytes": 123456,
      "protocolStats": [
        {"protocol": "TCP", "count": 900, "percentage": 91.2},
        {"protocol": "UDP", "count": 87, "percentage": 8.8}
      ]
    }
  ]
}
```

### 15. 获取数据包大小分布

获取数据包大小的分布统计。

**请求**:
```
GET /traffic/packet-size-distribution
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
{
  "total": 12345,
  "distribution": [
    {
      "min": 0,
      "max": 64,
      "label": "0-64 bytes",
      "count": 3456,
      "percentage": 28
    },
    {
      "min": 65,
      "max": 128,
      "label": "65-128 bytes",
      "count": 5432,
      "percentage": 44
    }
  ],
  "stats": {
    "min": 40,
    "max": 1500,
    "avg": 320,
    "median": 180
  }
}
```

### 16. 获取实时流量数据

获取实时流量监控数据。

**请求**:
```
GET /traffic/realtime
```

**响应**:
```json
{
  "summary": {
    "totalPackets": 543,
    "totalBytes": 654321,
    "avgPacketsPerSecond": 1.8,
    "avgBytesPerSecond": 2181,
    "duration": 300
  },
  "timePoints": [
    {
      "timestamp": "2023-05-20T14:29:00Z",
      "packetCount": 30,
      "byteCount": 34567,
      "packetsPerSecond": 3,
      "bytesPerSecond": 3456,
      "protocols": {
        "TCP": 25,
        "UDP": 5
      }
    }
  ]
}
```

### 17. 获取应用使用情况

获取应用层协议使用统计。

**请求**:
```
GET /traffic/applications
```

**参数**:

| 参数名 | 类型 | 描述 | 默认值 |
|-------|------|------|-------|
| limit | 整数 | 条目数量限制 | 10 |
| startTime | ISO日期字符串 | 开始时间 | - |
| endTime | ISO日期字符串 | 结束时间 | - |

**响应**:
```json
{
  "total": 15,
  "applications": [
    {
      "name": "HTTPS",
      "packetCount": 8765,
      "byteCount": 9876543,
      "ports": [443, 8443],
      "percentage": 71
    },
    {
      "name": "HTTP",
      "packetCount": 2345,
      "byteCount": 2345678,
      "ports": [80, 8080],
      "percentage": 19
    }
  ]
}
```

## 错误响应

当发生错误时，API将返回以下格式的响应：

```json
{
  "statusCode": 400,
  "message": "错误消息描述",
  "error": "错误类型"
}
```

常见HTTP状态码：
- 200: 成功
- 400: 请求参数错误
- 404: 资源不存在
- 500: 服务器内部错误 