import { Module } from '@nestjs/common';
import { TrafficController } from './traffic.controller';
import { TrafficService } from './traffic.service';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  controllers: [TrafficController],
  providers: [TrafficService, PrismaService],
})
export class TrafficModule {}