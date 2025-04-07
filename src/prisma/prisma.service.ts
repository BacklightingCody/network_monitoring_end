// src/prisma/prisma.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();  // 连接数据库
  }

  async onModuleDestroy() {
    await this.$disconnect();  // 断开连接
  }
}
