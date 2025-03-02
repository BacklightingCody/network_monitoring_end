import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { CpuService } from './cpu/cpu.service';
import { MemoryService } from './memory/memory.service';
import { DiskService } from './disk/disk.service';
import { NetworkService } from './network/network.service';
import { SystemService } from './system/system.service';
import { CpuController } from './cpu/cpu.controller';
import { MemoryController } from './memory/memory.controller';
import { DiskController } from './disk/disk.controller';
import { NetworkController } from './network/network.controller';
import { SystemController } from './system/system.controller';
import { RuntimeController } from './runtime/runtime.controller';
import { RuntimeService } from './runtime/runtime.service';

@Module({
  providers: [MetricsService, CpuService, MemoryService, DiskService, NetworkService, SystemService, RuntimeService],
  controllers: [MetricsController, CpuController, MemoryController, DiskController, NetworkController, SystemController, RuntimeController],
  exports: [
    MetricsService,
    CpuService,
    MemoryService,
    DiskService,
    NetworkService,
    SystemService,
    RuntimeService
  ]
})
export class MetricsModule { }
