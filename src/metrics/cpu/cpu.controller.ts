import { Controller, Get } from '@nestjs/common';
import { CpuService } from './cpu.service';

@Controller('metrics/cpu')
export class CpuController {
  constructor(private readonly cpuService: CpuService) {}

  @Get('clock-interrupts')
  getClockInterrupts() {
    return this.cpuService.getClockInterrupts();
  }

  @Get('core-frequency')
  getCoreFrequency() {
    return this.cpuService.getCoreFrequency();
  }

  @Get('cstate')
  getCpuCState() {
    return this.cpuService.getCpuCState();
  }

  @Get('dpcs')
  getDpcs() {
    return this.cpuService.getDpcs();
  }

  @Get('idle-break-events')
  getIdleBreakEvents() {
    return this.cpuService.getIdleBreakEvents();
  }

  @Get('interrupts')
  getInterrupts() {
    return this.cpuService.getInterrupts();
  }

  @Get('logical-processor')
  getLogicalProcessorCount() {
    return this.cpuService.getLogicalProcessorCount();
  }

  @Get('processor-performance')
  getProcessorPerformance() {
    return this.cpuService.getProcessorPerformance();
  }

  @Get('processor-utility')
  getProcessorUtility() {
    return this.cpuService.getProcessorUtility();
  }

  @Get('cpu-time')
  getCpuTime() {
    return this.cpuService.getCpuTime();
  }
}
