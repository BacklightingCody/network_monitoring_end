import { Controller, Get } from '@nestjs/common';
import { RuntimeService } from './runtime.service';

@Controller('metrics/runtime')
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Get('go-build')
  getGoBuildInfo() {
    return this.runtimeService.getGoBuildInfo();
  }

  @Get('go-gc')
  getGoGcMetrics() {
    return this.runtimeService.getGoGcMetrics();
  }

  @Get('go-memory')
  getGoMemoryMetrics() {
    return this.runtimeService.getGoMemoryMetrics();
  }

  @Get('go-goroutines')
  getGoGoroutines() {
    return this.runtimeService.getGoGoroutines();
  }

  @Get('go-info')
  getGoInfo() {
    return this.runtimeService.getGoInfo();
  }
}
