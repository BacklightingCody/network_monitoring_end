import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SystemService {
  private prometheusUrl = 'http://localhost:9091'; // Prometheus API URL

  async queryPrometheus(query: string): Promise<any> {
    const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
      params: { query },
    });
    return response.data.data.result;
  }

  async getHostname() {
    const query = 'windows_os_hostname';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getSystemInfo() {
    const query = 'windows_os_info';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getProcesses() {
    const query = 'windows_system_processes';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getProcessesLimit() {
    const query = 'windows_system_processes_limit';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getMemoryFree() {
    const query = 'windows_os_physical_memory_free_bytes';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getMemoryLimit() {
    const query = 'windows_os_process_memory_limit_bytes';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getSystemTime() {
    const query = 'windows_os_time';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getTimezone() {
    const query = 'windows_os_timezone';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getUsers() {
    const query = 'windows_os_users';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getBootTime() {
    const query = 'windows_system_boot_time_timestamp_seconds';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getCpuQueueLength() {
    const query = 'windows_system_processor_queue_length';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getContextSwitches() {
    const query = 'windows_system_context_switches_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getExceptionDispatches() {
    const query = 'windows_system_exception_dispatches_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getSystemCalls() {
    const query = 'windows_system_system_calls_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getThreads() {
    const query = 'windows_system_threads';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getLogicalProcessors() {
    const query = 'windows_cs_logical_processors';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPhysicalMemory() {
    const query = 'windows_cs_physical_memory_bytes';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getDiskIO() {
    const query = 'windows_physical_disk_read_bytes_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getServices() {
    const query = 'windows_service_info';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getServiceState() {
    const query = 'windows_service_state';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getCollectorDuration() {
    const query = 'windows_exporter_collector_duration_seconds';
    const result = await this.queryPrometheus(query);
    return result;
  }
}
