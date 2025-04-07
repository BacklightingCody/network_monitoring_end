import { Controller, Get, Query } from '@nestjs/common';
import { TrafficService } from './traffic.service';

@Controller('traffic')
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  @Get('packets')
  async getPackets(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('sourceIp') sourceIp?: string,
    @Query('destinationIp') destinationIp?: string,
  ) {
    return this.trafficService.getPackets({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sourceIp,
      destinationIp,
    });
  }

  @Get('analyze')
  async analyzeTraffic(@Query('packetId') packetId?: string) {
    return this.trafficService.analyzeTraffic(packetId ? parseInt(packetId, 10) : undefined);
  }
}