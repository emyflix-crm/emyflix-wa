import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async getUserGroups(userId: string, instanceId?: string) {
    const instances = await this.prisma.whatsAppInstance.findMany({
      where: { userId },
      select: { id: true },
    });
    const instanceIds = instances.map(i => i.id);
    
    return this.prisma.group.findMany({
      where: {
        instanceId: instanceId ? instanceId : { in: instanceIds },
      },
      orderBy: { name: 'asc' },
    });
  }
}
