import { Injectable } from '@nestjs/common';

// 使用 interface 定义 Device 类型
export interface Device {
  id: number;
  name: string;
  status: string;
}

@Injectable()
export class DevicesService {
  private readonly devices: Device[] = [
    { id: 1, name: 'Device 1', status: 'Active' },
    { id: 2, name: 'Device 2', status: 'Inactive' },
  ];

  getDevicesStatus(): Device[] {
    return this.devices;
  }

  getDeviceById(id: number): Device {
    return this.devices.find((device) => device.id === id);
  }
}
