import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WhatsAppService {
  private baseUrl: string;
  private apiKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('EVOLUTION_API_URL');
    this.apiKey = this.configService.get<string>('EVOLUTION_API_KEY');
  }

  private get headers() {
    return { apikey: this.apiKey, 'Content-Type': 'application/json' };
  }

  async createInstance(userId: string, instanceName: string) {
    const instanceKey = `${userId}-${Date.now()}`;
    
    try {
      await axios.post(
        `${this.baseUrl}/instance/create`,
        { instanceName: instanceKey, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
        { headers: this.headers }
      );

      return this.prisma.whatsAppInstance.create({
        data: {
          userId,
          instanceName,
          instanceKey,
          status: 'CONNECTING',
        }
      });
    } catch (error) {
      throw new BadRequestException('Failed to create instance in Evolution API');
    }
  }

  async getUserInstances(userId: string) {
    return this.prisma.whatsAppInstance.findMany({ where: { userId } });
  }

  async getQRCode(userId: string, id: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({ where: { id, userId } });
    if (!instance) throw new BadRequestException('Instance not found');

    try {
      const { data } = await axios.get(`${this.baseUrl}/instance/connect/${instance.instanceKey}`, { headers: this.headers });
      return { qrcode: data.base64 };
    } catch (error) {
      throw new BadRequestException('Failed to get QR Code');
    }
  }
}
