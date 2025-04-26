import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SeedLogsService } from './seed-logs.service';

@Module({
  imports: [PrismaModule],
  providers: [LogsService, SeedLogsService],
  controllers: [LogsController],
  exports: [LogsService]
})
export class LogsModule {}
