import { Controller, Get } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('metrics/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('hostname')
  getHostname() {
    return this.systemService.getHostname();
  }

  @Get('info')
  getSystemInfo() {
    return this.systemService.getSystemInfo();
  }

  @Get('processes')
  getProcesses() {
    return this.systemService.getProcesses();
  }

  @Get('processes-limit')
  getProcessesLimit() {
    return this.systemService.getProcessesLimit();
  }

  @Get('memory-free')
  getMemoryFree() {
    return this.systemService.getMemoryFree();
  }

  @Get('memory-limit')
  getMemoryLimit() {
    return this.systemService.getMemoryLimit();
  }

  @Get('time')
  getSystemTime() {
    return this.systemService.getSystemTime();
  }

  @Get('timezone')
  getTimezone() {
    return this.systemService.getTimezone();
  }

  @Get('users')
  getUsers() {
    return this.systemService.getUsers();
  }

  @Get('boot-time')
  getBootTime() {
    return this.systemService.getBootTime();
  }

  @Get('cpu-queue-length')
  getCpuQueueLength() {
    return this.systemService.getCpuQueueLength();
  }

  @Get('context-switches')
  getContextSwitches() {
    return this.systemService.getContextSwitches();
  }

  @Get('exception-dispatches')
  getExceptionDispatches() {
    return this.systemService.getExceptionDispatches();
  }

  @Get('system-calls')
  getSystemCalls() {
    return this.systemService.getSystemCalls();
  }

  @Get('threads')
  getThreads() {
    return this.systemService.getThreads();
  }

  @Get('logical-processors')
  getLogicalProcessors() {
    return this.systemService.getLogicalProcessors();
  }

  @Get('physical-memory')
  getPhysicalMemory() {
    return this.systemService.getPhysicalMemory();
  }

  @Get('disk-io')
  getDiskIO() {
    return this.systemService.getDiskIO();
  }

  @Get('services')
  getServices() {
    return this.systemService.getServices();
  }

  @Get('service-state')
  getServiceState() {
    return this.systemService.getServiceState();
  }

  @Get('collector-duration')
  getCollectorDuration() {
    return this.systemService.getCollectorDuration();
  }
}
