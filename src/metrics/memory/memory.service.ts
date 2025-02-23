import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MemoryService {
  private prometheusUrl = 'http://localhost:9091'; // Prometheus API URL

  private async queryPrometheus(query: string): Promise<any> {
    const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
      params: { query },
    });
    return response.data.data.result;
  }

  async getAvailableMemory() {
    const query = 'windows_memory_available_bytes';
    return this.queryPrometheus(query);
  }

  async getCacheBytes() {
    const query = 'windows_memory_cache_bytes';
    return this.queryPrometheus(query);
  }

  async getCachePeakBytes() {
    const query = 'windows_memory_cache_bytes_peak';
    return this.queryPrometheus(query);
  }

  async getCacheFaults() {
    const query = 'windows_memory_cache_faults_total';
    return this.queryPrometheus(query);
  }

  async getCommitLimit() {
    const query = 'windows_memory_commit_limit';
    return this.queryPrometheus(query);
  }

  async getCommittedBytes() {
    const query = 'windows_memory_committed_bytes';
    return this.queryPrometheus(query);
  }

  async getDemandZeroFaults() {
    const query = 'windows_memory_demand_zero_faults_total';
    return this.queryPrometheus(query);
  }

  async getFreeAndZeroPageListBytes() {
    const query = 'windows_memory_free_and_zero_page_list_bytes';
    return this.queryPrometheus(query);
  }

  async getFreeSystemPageTableEntries() {
    const query = 'windows_memory_free_system_page_table_entries';
    return this.queryPrometheus(query);
  }

  async getModifiedPageListBytes() {
    const query = 'windows_memory_modified_page_list_bytes';
    return this.queryPrometheus(query);
  }

  async getPageFaults() {
    const query = 'windows_memory_page_faults_total';
    return this.queryPrometheus(query);
  }

  async getPhysicalFreeBytes() {
    const query = 'windows_memory_physical_free_bytes';
    return this.queryPrometheus(query);
  }

  async getPhysicalTotalBytes() {
    const query = 'windows_memory_physical_total_bytes';
    return this.queryPrometheus(query);
  }

  async getPoolNonpagedBytes() {
    const query = 'windows_memory_pool_nonpaged_bytes';
    return this.queryPrometheus(query);
  }

  async getPoolPagedBytes() {
    const query = 'windows_memory_pool_paged_bytes';
    return this.queryPrometheus(query);
  }

  async getSwapPageOperations() {
    const query = 'windows_memory_swap_page_operations_total';
    return this.queryPrometheus(query);
  }

  async getSwapPageReads() {
    const query = 'windows_memory_swap_page_reads_total';
    return this.queryPrometheus(query);
  }

  async getSwapPageWrites() {
    const query = 'windows_memory_swap_page_writes_total';
    return this.queryPrometheus(query);
  }

  async getSystemCacheResidentBytes() {
    const query = 'windows_memory_system_cache_resident_bytes';
    return this.queryPrometheus(query);
  }

  async getSystemDriverResidentBytes() {
    const query = 'windows_memory_system_driver_resident_bytes';
    return this.queryPrometheus(query);
  }
}
