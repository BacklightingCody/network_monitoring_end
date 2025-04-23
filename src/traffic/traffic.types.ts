// 流量服务相关类型定义

// 实时流量数据类型
export interface RealtimeTrafficData {
  summary: {
    totalPackets: number;
    totalBytes: number;
    avgPacketsPerSecond: number;
    avgBytesPerSecond: number;
    duration: number;
  };
  timePoints: any[];
}

// 流量趋势数据类型
export interface TrafficTrendData {
  interval: string;
  metric: string;
  data: any[];
}

// 源IP和目标IP统计类型
export interface IpStatItem {
  ip: string;
  count: number;
}

// 统一的统计类型，用于Promise.all处理
export type StatisticsResult = 
  | { count: number; totalBytes: number; avgSize: number; protocols: {}; timeRange: any; sourceIPs?: undefined; destIPs?: undefined; }
  | { count: number; totalBytes: any; avgSize: number; protocols: Record<string, number>; sourceIPs: any[]; destIPs: any[]; timeRange: any }
  | { total: number; stats: any[] }
  | { connections: any[] }
  | { pairs: any[] }
  | { distribution: any[] }
  | { applications: any[] }
  | { ports: any[] }
  | { domestic: any; international: any }
  | IpStatItem[] 
  | RealtimeTrafficData
  | TrafficTrendData; 