import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NetworkService {
  private prometheusUrl = 'http://localhost:9091'; // Prometheus API URL

  async queryPrometheus(query: string): Promise<any> {
    const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
      params: { query },
    });
    return response.data.data.result;
  }

  async getBytesReceived() {
    const query = 'windows_net_bytes_received_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getBytesSent() {
    const query = 'windows_net_bytes_sent_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getBytesTotal() {
    const query = 'windows_net_bytes_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getCurrentBandwidth() {
    const query = 'windows_net_current_bandwidth_bytes';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getOutputQueueLength() {
    const query = 'windows_net_output_queue_length_packets';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPacketsReceived() {
    const query = 'windows_net_packets_received_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPacketsSent() {
    const query = 'windows_net_packets_sent_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPacketsTotal() {
    const query = 'windows_net_packets_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getNicAddressInfo() {
    const query = 'windows_net_nic_address_info';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPacketsOutboundErrors() {
    const query = 'windows_net_packets_outbound_errors_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPacketsReceivedErrors() {
    const query = 'windows_net_packets_received_errors_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPacketsReceivedDiscarded() {
    const query = 'windows_net_packets_received_discarded_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPacketsOutboundDiscarded() {
    const query = 'windows_net_packets_outbound_discarded_total';
    const result = await this.queryPrometheus(query);
    return result;
  }

  async getPacketsReceivedUnknown() {
    const query = 'windows_net_packets_received_unknown_total';
    const result = await this.queryPrometheus(query);
    return result;
  }
}
