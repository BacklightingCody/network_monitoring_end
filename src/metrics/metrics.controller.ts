import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('cpu')
  async getCpu() {
    const cpu = await this.metricsService.getCpuUsage();
    return { cpu_usage: cpu, timestamp: Math.floor(Date.now() / 1000) };
  }

  @Get('memory')
  async getMemory() {
    const memory = await this.metricsService.getMemoryUsage();
    return { memory_usage: memory, timestamp: Math.floor(Date.now() / 1000) };
  }

  @Get('garbage-collection')
  async getGarbageCollection() {
    const gcStats = await this.metricsService.getGarbageCollectionStats();
    return { gc_duration: gcStats, timestamp: Math.floor(Date.now() / 1000) };
  }

  @Get('goroutines')
  async getGoroutines() {
    const goroutines = await this.metricsService.getGoroutinesCount();
    return { goroutines_count: goroutines, timestamp: Math.floor(Date.now() / 1000) };
  }

  @Get('go-info')
  async getGoInfo() {
    const goInfo = await this.metricsService.getGoInfo();
    return { go_version: goInfo.version, timestamp: Math.floor(Date.now() / 1000) };
  }

  @Get('heap')
  async getHeap() {
    const heapStats = await this.metricsService.getHeapStats();
    return { heap_usage: heapStats, timestamp: Math.floor(Date.now() / 1000) };
  }

  @Get('processes')
  async getProcesses() {
    const processes = await this.metricsService.getProcessCount();
    return { process_count: processes, timestamp: Math.floor(Date.now() / 1000) };
  }

  @Get('file-descriptors')
  async getFileDescriptors() {
    const fileDescriptors = await this.metricsService.getFileDescriptorsCount();
    return { open_fds: fileDescriptors, timestamp: Math.floor(Date.now() / 1000) };
  }

  @Get('threads')
  async getThreads() {
    const threads = await this.metricsService.getThreadsCount();
    return { threads_count: threads, timestamp: Math.floor(Date.now() / 1000) };
  }
}
