import { Controller, Get, Param } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from './devices.service'; // 导入 Device 类型

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  getDevicesStatus() {
    return this.devicesService.getDevicesStatus();
  }

  @Get(':id')
  getDeviceById(@Param('id') id: number): Device { // 确保返回值类型是 Device
    return this.devicesService.getDeviceById(id);
  }
}
