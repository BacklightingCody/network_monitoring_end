import { Controller, Get } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('metrics/memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('available-bytes')
  getAvailableMemory() {
    return this.memoryService.getAvailableMemory();
  }

  @Get('cache-bytes')
  getCacheBytes() {
    return this.memoryService.getCacheBytes();
  }

  @Get('cache-peak-bytes')
  getCachePeakBytes() {
    return this.memoryService.getCachePeakBytes();
  }

  @Get('cache-faults-total')
  getCacheFaults() {
    return this.memoryService.getCacheFaults();
  }

  @Get('commit-limit')
  getCommitLimit() {
    return this.memoryService.getCommitLimit();
  }

  @Get('committed-bytes')
  getCommittedBytes() {
    return this.memoryService.getCommittedBytes();
  }

  @Get('demand-zero-faults-total')
  getDemandZeroFaults() {
    return this.memoryService.getDemandZeroFaults();
  }

  @Get('free-zero-page-list-bytes')
  getFreeAndZeroPageListBytes() {
    return this.memoryService.getFreeAndZeroPageListBytes();
  }

  @Get('free-system-page-table-entries')
  getFreeSystemPageTableEntries() {
    return this.memoryService.getFreeSystemPageTableEntries();
  }

  @Get('modified-page-list-bytes')
  getModifiedPageListBytes() {
    return this.memoryService.getModifiedPageListBytes();
  }

  @Get('page-faults-total')
  getPageFaults() {
    return this.memoryService.getPageFaults();
  }

  @Get('physical-free-bytes')
  getPhysicalFreeBytes() {
    return this.memoryService.getPhysicalFreeBytes();
  }

  @Get('physical-total-bytes')
  getPhysicalTotalBytes() {
    return this.memoryService.getPhysicalTotalBytes();
  }

  @Get('pool-nonpaged-bytes')
  getPoolNonpagedBytes() {
    return this.memoryService.getPoolNonpagedBytes();
  }

  @Get('pool-paged-bytes')
  getPoolPagedBytes() {
    return this.memoryService.getPoolPagedBytes();
  }

  @Get('swap-page-operations-total')
  getSwapPageOperations() {
    return this.memoryService.getSwapPageOperations();
  }

  @Get('swap-page-reads-total')
  getSwapPageReads() {
    return this.memoryService.getSwapPageReads();
  }

  @Get('swap-page-writes-total')
  getSwapPageWrites() {
    return this.memoryService.getSwapPageWrites();
  }

  @Get('system-cache-resident-bytes')
  getSystemCacheResidentBytes() {
    return this.memoryService.getSystemCacheResidentBytes();
  }

  @Get('system-driver-resident-bytes')
  getSystemDriverResidentBytes() {
    return this.memoryService.getSystemDriverResidentBytes();
  }
}
