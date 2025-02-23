import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MetricsService {
  private prometheusUrl = 'http://localhost:9091';

  async queryPrometheus(query: string): Promise<any> {
    const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
      params: { query },
    });
    return response.data.data.result;
  }

  async getCpuUsage(): Promise<number> {
    const query = '100 - (avg(rate(windows_cpu_time_total{mode="idle"}[5m])) * 100)';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;
  }

  async getMemoryUsage(): Promise<number> {
    const query = '100 * (1 - windows_memory_available_bytes / windows_os_visible_memory_bytes)';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;
  }

  async getNetworkRx(): Promise<number> {
    const query = 'rate(windows_net_bytes_received_total[5m])';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;
  }

  async getProcessCount(): Promise<number> {
    const query = 'windows_os_processes';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;
  }

  // Garbage Collection Duration
  async getGarbageCollectionStats(): Promise<any> {
    const query = 'avg(go_gc_duration_seconds{quantile="0.5"}) by (quantile)';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;
  }

  // Number of Goroutines
  async getGoroutinesCount(): Promise<number> {
    const query = 'go_goroutines';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;
  }

  // Go Environment Info (Go Version)
  async getGoInfo(): Promise<any> {
    const query = 'go_info';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? { version: result[0].value[1] } : { version: 'unknown' };
  }

  // Heap Stats (Allocated Bytes, In-Use Bytes, etc.)
  async getHeapStats(): Promise<any> {
    const query = 'go_memstats_heap_alloc_bytes';
    const result = await this.queryPrometheus(query);
    const heapAllocBytes = result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;

    const queryInUse = 'go_memstats_heap_inuse_bytes';
    const resultInUse = await this.queryPrometheus(queryInUse);
    const heapInUseBytes = resultInUse[0]?.value[1] ? parseFloat(resultInUse[0].value[1]) : 0;

    return {
      heap_alloc_bytes: heapAllocBytes,
      heap_in_use_bytes: heapInUseBytes,
    };
  }

  // File Descriptors (Open FDs)
  async getFileDescriptorsCount(): Promise<number> {
    const query = 'process_open_fds';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;
  }

  // Number of Threads
  async getThreadsCount(): Promise<number> {
    const query = 'go_threads';
    const result = await this.queryPrometheus(query);
    return result[0]?.value[1] ? parseFloat(result[0].value[1]) : 0;
  }
}
