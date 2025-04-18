import { Controller, Get } from '@nestjs/common';
import { NetworkService } from './network.service';

@Controller('metrics/network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('bytes-received')
  getBytesReceived() {
    return this.networkService.getBytesReceived();
  }

  @Get('bytes-sent')
  getBytesSent() {
    return this.networkService.getBytesSent();
  }

  @Get('bytes-total')
  getBytesTotal() {
    return this.networkService.getBytesTotal();
  }

  @Get('current-bandwidth')
  getCurrentBandwidth() {
    return this.networkService.getCurrentBandwidth();
  }

  @Get('output-queue-length')
  getOutputQueueLength() {
    return this.networkService.getOutputQueueLength();
  }

  @Get('packets-received')
  getPacketsReceived() {
    return this.networkService.getPacketsReceived();
  }

  @Get('packets-sent')
  getPacketsSent() {
    return this.networkService.getPacketsSent();
  }

  @Get('packets-total')
  getPacketsTotal() {
    return this.networkService.getPacketsTotal();
  }

  @Get('nic-address-info')
  getNicAddressInfo() {
    return this.networkService.getNicAddressInfo();
  }

  @Get('packets-outbound-errors')
  getPacketsOutboundErrors() {
    return this.networkService.getPacketsOutboundErrors();
  }

  @Get('packets-received-errors')
  getPacketsReceivedErrors() {
    return this.networkService.getPacketsReceivedErrors();
  }

  @Get('packets-received-discarded')
  getPacketsReceivedDiscarded() {
    return this.networkService.getPacketsReceivedDiscarded();
  }

  @Get('packets-outbound-discarded')
  getPacketsOutboundDiscarded() {
    return this.networkService.getPacketsOutboundDiscarded();
  }

  @Get('packets-received-unknown')
  getPacketsReceivedUnknown() {
    return this.networkService.getPacketsReceivedUnknown();
  }

  @Get('all')
  async getAllNetworkMetrics() {
    const [
      bytesReceived,
      bytesSent,
      bytesTotal,
      currentBandwidth,
      outputQueueLength,
      packetsReceived,
      packetsSent,
      packetsTotal,
      nicAddressInfo,
      packetsOutboundErrors,
      packetsReceivedErrors,
      packetsReceivedDiscarded,
      packetsOutboundDiscarded,
      packetsReceivedUnknown
    ] = await Promise.all([
      this.networkService.getBytesReceived(),
      this.networkService.getBytesSent(),
      this.networkService.getBytesTotal(),
      this.networkService.getCurrentBandwidth(),
      this.networkService.getOutputQueueLength(),
      this.networkService.getPacketsReceived(),
      this.networkService.getPacketsSent(),
      this.networkService.getPacketsTotal(),
      this.networkService.getNicAddressInfo(),
      this.networkService.getPacketsOutboundErrors(),
      this.networkService.getPacketsReceivedErrors(),
      this.networkService.getPacketsReceivedDiscarded(),
      this.networkService.getPacketsOutboundDiscarded(),
      this.networkService.getPacketsReceivedUnknown()
    ]);

    return {
      bytesReceived,
      bytesSent,
      bytesTotal,
      currentBandwidth,
      outputQueueLength,
      packetsReceived,
      packetsSent,
      packetsTotal,
      nicAddressInfo,
      packetsOutboundErrors,
      packetsReceivedErrors,
      packetsReceivedDiscarded,
      packetsOutboundDiscarded,
      packetsReceivedUnknown
    };
  }
}
