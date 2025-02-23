import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RuntimeService {
  private prometheusUrl = 'http://localhost:9091';

  private async queryPrometheus(query: string): Promise<any> {
    const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
      params: { query },
    });
    return response.data.data.result;
  }

  // 获取 Go 构建信息
  async getGoBuildInfo() {
    return {
      checksum: '',
      path: 'github.com/prometheus-community/windows_exporter',
      version: '(devel)',
    };
  }

  // 获取 Go 垃圾回收相关指标
  async getGoGcMetrics() {
    const queryGc = 'avg(go_gc_duration_seconds{quantile="0.5"}) by (quantile)';
    const gcResult = await this.queryPrometheus(queryGc);
    const gcDuration = gcResult[0]?.value[1] ? parseFloat(gcResult[0].value[1]) : 0;

    const queryGogc = 'go_gc_gogc_percent';
    const gogcResult = await this.queryPrometheus(queryGogc);
    const gogcPercent = gogcResult[0]?.value[1] ? parseFloat(gogcResult[0].value[1]) : 100;

    const queryMemLimit = 'go_gc_gomemlimit_bytes';
    const memLimitResult = await this.queryPrometheus(queryMemLimit);
    const gomemlimit = memLimitResult[0]?.value[1] ? parseFloat(memLimitResult[0].value[1]) : 2e+08;

    return {
      gcDuration: {
        quantile_0: 0,
        quantile_0_25: 0,
        quantile_0_5: 0,
        quantile_0_75: 0,
        quantile_1: gcDuration,
        sum: 0.2305039,
        count: 2736,
      },
      gogcPercent: gogcPercent,
      gomemlimit: gomemlimit,
    };
  }

  // 获取 Go 内存相关指标
  async getGoMemoryMetrics() {
    const queryAllocBytes = 'go_memstats_alloc_bytes';
    const allocResult = await this.queryPrometheus(queryAllocBytes);
    const allocBytes = allocResult[0]?.value[1] ? parseFloat(allocResult[0].value[1]) : 0;

    const queryAllocBytesTotal = 'go_memstats_alloc_bytes_total';
    const allocTotalResult = await this.queryPrometheus(queryAllocBytesTotal);
    const allocBytesTotal = allocTotalResult[0]?.value[1] ? parseFloat(allocTotalResult[0].value[1]) : 0;

    const queryFreesTotal = 'go_memstats_frees_total';
    const freesResult = await this.queryPrometheus(queryFreesTotal);
    const freesTotal = freesResult[0]?.value[1] ? parseFloat(freesResult[0].value[1]) : 0;

    const queryHeapAllocBytes = 'go_memstats_heap_alloc_bytes';
    const heapAllocResult = await this.queryPrometheus(queryHeapAllocBytes);
    const heapAllocBytes = heapAllocResult[0]?.value[1] ? parseFloat(heapAllocResult[0].value[1]) : 0;

    const queryHeapIdleBytes = 'go_memstats_heap_idle_bytes';
    const heapIdleResult = await this.queryPrometheus(queryHeapIdleBytes);
    const heapIdleBytes = heapIdleResult[0]?.value[1] ? parseFloat(heapIdleResult[0].value[1]) : 0;

    const queryHeapInUseBytes = 'go_memstats_heap_inuse_bytes';
    const heapInUseResult = await this.queryPrometheus(queryHeapInUseBytes);
    const heapInUseBytes = heapInUseResult[0]?.value[1] ? parseFloat(heapInUseResult[0].value[1]) : 0;

    const queryHeapObjects = 'go_memstats_heap_objects';
    const heapObjectsResult = await this.queryPrometheus(queryHeapObjects);
    const heapObjects = heapObjectsResult[0]?.value[1] ? parseFloat(heapObjectsResult[0].value[1]) : 0;

    return {
      allocBytes: allocBytes,
      allocBytesTotal: allocBytesTotal,
      freesTotal: freesTotal,
      heapAllocBytes: heapAllocBytes,
      heapIdleBytes: heapIdleBytes,
      heapInuseBytes: heapInUseBytes,
      heapObjects: heapObjects,
    };
  }

  // 获取 Go 协程和线程相关指标
  async getGoGoroutines() {
    const queryGoroutines = 'go_goroutines';
    const goroutinesResult = await this.queryPrometheus(queryGoroutines);
    const goroutines = goroutinesResult[0]?.value[1] ? parseFloat(goroutinesResult[0].value[1]) : 0;

    const queryThreads = 'go_threads';
    const threadsResult = await this.queryPrometheus(queryThreads);
    const threads = threadsResult[0]?.value[1] ? parseFloat(threadsResult[0].value[1]) : 0;

    const queryGomaxprocs = 'go_sched_gomaxprocs_threads';
    const gomaxprocsResult = await this.queryPrometheus(queryGomaxprocs);
    const gomaxprocs = gomaxprocsResult[0]?.value[1] ? parseFloat(gomaxprocsResult[0].value[1]) : 0;

    return {
      goRoutines: goroutines,
      threads: threads,
      gomaxprocs: gomaxprocs,
    };
  }

  // 获取 Go 版本信息
  async getGoInfo() {
    const queryGoInfo = 'go_info';
    const goInfoResult = await this.queryPrometheus(queryGoInfo);
    return {
      version: goInfoResult[0]?.value[1] || 'unknown',
    };
  }
}
