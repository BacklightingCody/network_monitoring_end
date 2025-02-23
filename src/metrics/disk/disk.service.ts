import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DiskService {
  private prometheusUrl = 'http://localhost:9091'; // Prometheus API URL

  async queryPrometheus(query: string): Promise<any> {
    const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
      params: { query },
    });
    return response.data.data.result;
  }

  async getAvgReadRequestsQueued() {
    const query = 'windows_logical_disk_avg_read_requests_queued';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getAvgWriteRequestsQueued() {
    const query = 'windows_logical_disk_avg_write_requests_queued';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getFreeBytes() {
    const query = 'windows_logical_disk_free_bytes';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getIdleSeconds() {
    const query = 'windows_logical_disk_idle_seconds_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getReadBytesTotal() {
    const query = 'windows_logical_disk_read_bytes_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getReadLatencySeconds() {
    const query = 'windows_logical_disk_read_latency_seconds_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getReadSeconds() {
    const query = 'windows_logical_disk_read_seconds_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getWriteBytesTotal() {
    const query = 'windows_logical_disk_write_bytes_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getWriteLatencySeconds() {
    const query = 'windows_logical_disk_write_latency_seconds_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getWriteSeconds() {
    const query = 'windows_logical_disk_write_seconds_total';
    const result = await this.queryPrometheus(query);
    return result;
  }
}
