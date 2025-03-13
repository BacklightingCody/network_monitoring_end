import { Controller, Get } from '@nestjs/common';
import { CpuService } from './cpu.service';

@Controller('metrics/cpu')
export class CpuController {
  constructor(private readonly cpuService: CpuService) { }
  // 获取 CPU 时钟中断
  @Get('clock-interrupts')
  getClockInterrupts() {
    return this.cpuService.getClockInterrupts();
  }
  // 获取核心频率  @Get('core-frequency')
  @Get('core-frequency')
  getCoreFrequency() {
    return this.cpuService.getCoreFrequency();
  }
  // 获取 CPU 逻辑核心数
  @Get('cstate')
  getCpuCState() {
    return this.cpuService.getCpuCState();
  }
  // 获取 CPU 中断和 DPC
  @Get('dpcs')
  getDpcs() {
    return this.cpuService.getDpcs();
  }
  @Get('interrupts')
  getInterrupts() {
    return this.cpuService.getInterrupts();
  }


  @Get('idle-break-events')
  getIdleBreakEvents() {
    return this.cpuService.getIdleBreakEvents();
  }




  // 获取 CPU 逻辑核心数
  @Get('logical-processor')
  getLogicalProcessorCount() {
    return this.cpuService.getLogicalProcessorCount();
  }
  // 获取 CPU 性能
  @Get('processor-performance')
  getProcessorPerformance() {
    return this.cpuService.getProcessorPerformance();
  }

  @Get('processor-utility')
  getProcessorUtility() {
    return this.cpuService.getProcessorUtility();
  }
  // 获取 CPU 执行时间
  @Get('cpu-time')
  getCpuTime() {
    return this.cpuService.getCpuTime();
  }

  @Get('all')
  async getAllCpuMetrics() {
    const [
      clockInterrupts,
      coreFrequency,
      cpuCState,
      dpcs,
      interrupts,
      idleBreakEvents,
      logicalProcessor,
      processorPerformance,
      processorUtility,
      cpuTime
    ] = await Promise.all([
      this.cpuService.getClockInterrupts(),
      this.cpuService.getCoreFrequency(),
      this.cpuService.getCpuCState(),
      this.cpuService.getDpcs(),
      this.cpuService.getInterrupts(),
      this.cpuService.getIdleBreakEvents(),
      this.cpuService.getLogicalProcessorCount(),
      this.cpuService.getProcessorPerformance(),
      this.cpuService.getProcessorUtility(),
      this.cpuService.getCpuTime()
    ]);

    return {
      clockInterrupts,
      coreFrequency,
      cpuCState,
      dpcs,
      interrupts,
      idleBreakEvents,
      logicalProcessor,
      processorPerformance,
      processorUtility,
      cpuTime
    };
  }
}
