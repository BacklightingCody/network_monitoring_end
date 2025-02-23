import { Controller, Get, Param } from '@nestjs/common';
import { TrafficService } from './traffic.service';

@Controller('traffic')
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  @Get()
  getTrafficData() {
    return this.trafficService.getTrafficData();
  }

  @Get(':deviceId')
  getTrafficByDevice(@Param('deviceId') deviceId: number) {
    return this.trafficService.getTrafficByDevice(deviceId);
  }
}
