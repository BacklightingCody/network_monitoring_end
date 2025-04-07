import { Module } from '@nestjs/common';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CaptureConfig } from '@/config/capture.config';

@Module({
  controllers: [CaptureController],
  providers: [CaptureService, PrismaService, CaptureConfig],
})
export class CaptureModule {}