import { Injectable } from '@nestjs/common';

export interface TrafficData {
  deviceId: number;
  type: string;
  amount: number; // 流量量
}

@Injectable()
export class TrafficService {
  private readonly trafficData: TrafficData[] = [
    { deviceId: 1, type: 'video', amount: 120 },
    { deviceId: 2, type: 'download', amount: 150 },
  ];

  getTrafficData(): TrafficData[] {
    return this.trafficData;
  }

  getTrafficByDevice(deviceId: number): TrafficData[] {
    return this.trafficData.filter((data) => data.deviceId === deviceId);
  }
}
