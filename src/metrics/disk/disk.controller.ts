import { Controller, Get } from '@nestjs/common';
import { DiskService } from './disk.service';

@Controller('metrics/disk')
export class DiskController {
  constructor(private readonly diskService: DiskService) {}

  @Get('all')
  async getAllDiskMetrics() {
    const [
      avgReadRequestsQueued,
      avgWriteRequestsQueued,
      freeBytes,
      idleSeconds,
      readBytesTotal,
      readLatencySeconds,
      readSeconds,
      writeBytesTotal,
      writeLatencySeconds,
      writeSeconds
    ] = await Promise.all([
      this.diskService.getAvgReadRequestsQueued(),
      this.diskService.getAvgWriteRequestsQueued(),
      this.diskService.getFreeBytes(),
      this.diskService.getIdleSeconds(),
      this.diskService.getReadBytesTotal(),
      this.diskService.getReadLatencySeconds(),
      this.diskService.getReadSeconds(),
      this.diskService.getWriteBytesTotal(),
      this.diskService.getWriteLatencySeconds(),
      this.diskService.getWriteSeconds()
    ]);

    return {
      avgReadRequestsQueued,
      avgWriteRequestsQueued,
      freeBytes,
      idleSeconds,
      readBytesTotal,
      readLatencySeconds,
      readSeconds,
      writeBytesTotal,
      writeLatencySeconds,
      writeSeconds
    };
  }

  @Get('avg-read-requests-queued')
  getAvgReadRequestsQueued() {
    return this.diskService.getAvgReadRequestsQueued();
  }

  @Get('avg-write-requests-queued')
  getAvgWriteRequestsQueued() {
    return this.diskService.getAvgWriteRequestsQueued();
  }

  @Get('free-bytes')
  getFreeBytes() {
    return this.diskService.getFreeBytes();
  }

  @Get('idle-seconds')
  getIdleSeconds() {
    return this.diskService.getIdleSeconds();
  }

  @Get('read-bytes-total')
  getReadBytesTotal() {
    return this.diskService.getReadBytesTotal();
  }

  @Get('read-latency-seconds')
  getReadLatencySeconds() {
    return this.diskService.getReadLatencySeconds();
  }

  @Get('read-seconds')
  getReadSeconds() {
    return this.diskService.getReadSeconds();
  }

  @Get('write-bytes-total')
  getWriteBytesTotal() {
    return this.diskService.getWriteBytesTotal();
  }

  @Get('write-latency-seconds')
  getWriteLatencySeconds() {
    return this.diskService.getWriteLatencySeconds();
  }

  @Get('write-seconds')
  getWriteSeconds() {
    return this.diskService.getWriteSeconds();
  }
}
