import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { MlServiceConfig } from '../config/ml-service.config';
import { PythonService } from './python-service';
import { TrafficModule } from '../traffic/traffic.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    forwardRef(() => TrafficModule),
  ],
  controllers: [AnalysisController],
  providers: [
    AnalysisService, 
    MlServiceConfig, 
    PythonService,
  ],
  exports: [AnalysisService, PythonService],
})
export class AnalysisModule {} 