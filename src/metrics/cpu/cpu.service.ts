import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CpuService {
  private prometheusUrl = 'http://localhost:9091'; // Prometheus API URL

  async queryPrometheus(query: string): Promise<any> {
    const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
      params: { query },
    });
    return response.data.data.result;
  }

  async getClockInterrupts() {
    const query = 'windows_cpu_clock_interrupts_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getCoreFrequency() {
    const query = 'windows_cpu_core_frequency_mhz';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getCpuCState() {
    const query = 'windows_cpu_cstate_seconds_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getDpcs() {
    const query = 'windows_cpu_dpcs_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getIdleBreakEvents() {
    const query = 'windows_cpu_idle_break_events_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getInterrupts() {
    const query = 'windows_cpu_interrupts_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getLogicalProcessorCount() {
    const query = 'windows_cpu_logical_processor';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getProcessorPerformance() {
    const query = '100 - (avg(rate(windows_cpu_time_total{mode="idle"}[1m])) by (core) * 100)';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getProcessorUtility() {
    const query = 'windows_cpu_processor_utility_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getCpuTime() {
    const query = 'windows_cpu_time_total';
    const result = await this.queryPrometheus(query);
    return result;
  }
}
