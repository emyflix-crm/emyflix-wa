import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@emyflix.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@emyflix.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      emailVerified: true,
      status: 'ACTIVE',
    },
  });

  const plans = [
    {
      name: 'Prata',
      slug: 'prata',
      description: 'Plano básico',
      price: 29.90,
      maxMessagesPerDay: 100,
      maxGroups: 50,
      maxCampaigns: 20,
      maxInstances: 1,
      sortOrder: 1,
    },
    {
      name: 'Gold',
      slug: 'gold',
      description: 'Plano intermediário',
      price: 59.90,
      maxMessagesPerDay: 500,
      maxGroups: 150,
      maxCampaigns: 100,
      maxInstances: 2,
      features: { mostPopular: true },
      sortOrder: 2,
    },
    {
      name: 'Diamante',
      slug: 'diamante',
      description: 'Plano avançado',
      price: 119.90,
      maxMessagesPerDay: 2000,
      maxGroups: 500,
      maxCampaigns: 500,
      maxInstances: 5,
      sortOrder: 3,
    },
    {
      name: 'Empresarial',
      slug: 'empresarial',
      description: 'Plano completo',
      price: 249.90,
      maxMessagesPerDay: 5000,
      maxGroups: 1000,
      maxCampaigns: 9999,
      maxInstances: 20,
      sortOrder: 4,
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
