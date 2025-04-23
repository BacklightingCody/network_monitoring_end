/**
 * 网络节点接口
 */
export interface NetworkNode {
  id: string;             // 节点ID（IP地址）
  name: string;           // 节点名称（显示用）
  value: number;          // 节点值（通常用于视觉大小）
  type: 'internal' | 'external'; // 节点类型：内部/外部
  category: number;       // 节点分类（用于图形颜色分组）
  packetsSent: number;    // 发送的数据包数量
  packetsReceived: number; // 接收的数据包数量 
  totalBytesSent: number; // 发送的总字节数
  totalBytesReceived: number; // 接收的总字节数
  protocols: Record<string, number>; // 协议统计
  mainProtocol?: string;  // 主要协议
}

/**
 * 网络连接接口
 */
export interface NetworkLink {
  source: string;         // 源节点ID
  target: string;         // 目标节点ID
  value: number;          // 连接值（通常用于线条粗细）
  protocol: string;       // 主要协议
  packets: number;        // 数据包数量
  bytes: number;          // 总字节数
}

/**
 * 拓扑图汇总数据
 */
export interface TopologySummary {
  nodeCount: number;      // 节点总数
  linkCount: number;      // 连接总数
  internalNodes: number;  // 内部节点数量
  externalNodes: number;  // 外部节点数量
  totalPackets: number;   // 总数据包数
}

/**
 * 拓扑图完整数据
 */
export interface TopologyData {
  nodes: NetworkNode[];   // 节点列表
  links: NetworkLink[];   // 连接列表
  summary: TopologySummary; // 汇总信息
}

/**
 * 连接节点信息
 */
export interface ConnectedNode {
  ip: string;             // IP地址
  packetsSent: number;    // 发送包数量
  packetsReceived: number; // 接收包数量
  totalBytes: number;     // 总字节数
}

/**
 * 协议分布信息
 */
export interface ProtocolStats {
  protocol: string;       // 协议名称
  count: number;          // 数据包数量
  percentage: number;     // 百分比
}

/**
 * 时间序列数据点
 */
export interface TimeSeriesPoint {
  time: string;           // 时间点（格式化字符串）
  packets: number;        // 数据包数量
  bytes: number;          // 字节数
}

/**
 * 节点详细信息
 */
export interface NodeDetails {
  nodeId: string;                     // 节点ID（IP地址）
  totalPacketsSent: number;           // 发送的总数据包
  totalPacketsReceived: number;       // 接收的总数据包
  totalBytesSent: number;             // 发送的总字节数
  totalBytesReceived: number;         // 接收的总字节数
  connectedNodes: ConnectedNode[];    // 连接的节点
  protocolDistribution: ProtocolStats[]; // 协议分布
  trafficTrend: TimeSeriesPoint[];    // 流量趋势
} 