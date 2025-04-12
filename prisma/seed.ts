// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 插入一些示例数据
  await prisma.packet.create({
    data: {
      timestamp: new Date(),
      sourceIp: '192.168.1.1',
      destinationIp: '192.168.1.2',
      protocol: 'TCP',
      sourcePort: 80,
      destinationPort: 443,
      length: 64,
    },
  });

  await prisma.packet.create({
    data: {
      timestamp: new Date(),
      sourceIp: '192.168.1.3',
      destinationIp: '192.168.1.4',
      protocol: 'UDP',
      sourcePort: 53,
      destinationPort: 5353,
      length: 128,
    },
  });

  console.log('Seed data inserted!');
}

main()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  });
