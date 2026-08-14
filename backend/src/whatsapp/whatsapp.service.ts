import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private apiUrl: string;
  private apiKey: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.apiUrl = this.config.get('EVOLUTION_API_URL') || 'http://n8n_evolution-api:8080';
    this.apiKey = this.config.get('EVOLUTION_API_KEY') || '';
  }

  private get headers() {
    return { apikey: this.apiKey, 'Content-Type': 'application/json' };
  }

  async createInstance(userId: string, instanceName: string) {
    const slug = `${userId.slice(0, 8)}_${instanceName.replace(/\\s/g, '_').toLowerCase()}`;
    
    try {
      await axios.post(`${this.apiUrl}/instance/create`, {
        instanceName: slug,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }, { headers: this.headers });
    } catch (e) {
      console.error('Error creating evolution instance:', e?.response?.data);
    }

    return this.prisma.whatsAppInstance.create({
      data: {
        userId,
        instanceName,
        instanceKey: slug,
        status: 'CONNECTING' as any,
      },
    });
  }

  async getQRCode(userId: string, instanceId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({ where: { id: instanceId, userId } });
    if (!instance) throw new NotFoundException('Instância não encontrada');
    
    try {
      const response = await axios.get(`${this.apiUrl}/instance/connect/${instance.instanceKey}`, { headers: this.headers });
      return { qrcode: response.data?.base64 || response.data?.qrcode || response.data };
    } catch (e) {
      return { qrcode: null, error: 'Não foi possível obter o QR Code' };
    }
  }

  async getInstanceStatus(userId: string, instanceId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({ where: { id: instanceId, userId } });
    if (!instance) throw new NotFoundException('Instância não encontrada');

    try {
      const response = await axios.get(`${this.apiUrl}/instance/connectionState/${instance.instanceKey}`, { headers: this.headers });
      const state = response.data?.instance?.state || response.data?.state;
      const isConnected = state === 'open';
      
      await this.prisma.whatsAppInstance.update({
        where: { id: instanceId },
        data: { status: isConnected ? 'CONNECTED' : 'DISCONNECTED' as any, lastSeenAt: new Date() },
      });

      return { status: isConnected ? 'CONNECTED' : 'DISCONNECTED', state };
    } catch (e) {
      return { status: 'ERROR', state: null };
    }
  }

  async checkConnection(instanceKey: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/instance/connectionState/${instanceKey}`, { headers: this.headers });
      const state = response.data?.instance?.state || response.data?.state;
      return state === 'open';
    } catch {
      return false;
    }
  }

  async disconnectInstance(userId: string, instanceId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({ where: { id: instanceId, userId } });
    if (!instance) throw new NotFoundException('Instância não encontrada');
    
    try {
      await axios.delete(`${this.apiUrl}/instance/logout/${instance.instanceKey}`, { headers: this.headers });
    } catch (e) {
      console.error('Error disconnecting:', e?.response?.data);
    }
    
    return this.prisma.whatsAppInstance.update({
      where: { id: instanceId },
      data: { status: 'DISCONNECTED' as any },
    });
  }

  async deleteInstance(userId: string, instanceId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({ where: { id: instanceId, userId } });
    if (!instance) throw new NotFoundException('Instância não encontrada');
    
    try {
      await axios.delete(`${this.apiUrl}/instance/delete/${instance.instanceKey}`, { headers: this.headers });
    } catch (e) {
      console.error('Error deleting from evolution:', e?.response?.data);
    }
    
    return this.prisma.whatsAppInstance.delete({ where: { id: instanceId } });
  }

  async getUserInstances(userId: string) {
    return this.prisma.whatsAppInstance.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async syncGroups(userId: string, instanceId: string) {
    const instance = await this.prisma.whatsAppInstance.findFirst({ where: { id: instanceId, userId } });
    if (!instance) throw new NotFoundException('Instância não encontrada');

    try {
      const response = await axios.get(
        `${this.apiUrl}/group/fetchAllGroups/${instance.instanceKey}?getParticipants=false`,
        { headers: this.headers },
      );

      const groups = Array.isArray(response.data) ? response.data : [];
      
      for (const group of groups) {
        await this.prisma.group.upsert({
          where: { groupJid: group.id },
          create: {
            instanceId,
            groupJid: group.id,
            name: group.subject || group.name || 'Grupo sem nome',
            isAvailable: true,
            lastSyncedAt: new Date(),
          },
          update: {
            name: group.subject || group.name || 'Grupo sem nome',
            isAvailable: true,
            lastSyncedAt: new Date(),
          },
        });
      }

      return { synced: groups.length, message: `${groups.length} grupos sincronizados` };
    } catch (e) {
      throw new BadRequestException('Erro ao sincronizar grupos: ' + (e?.response?.data?.message || e.message));
    }
  }

  async sendMessage(instanceKey: string, groupJid: string, message: string, mediaUrl?: string, mediaType?: string) {
    if (!mediaUrl || mediaType === 'TEXT') {
      await axios.post(`${this.apiUrl}/message/sendText/${instanceKey}`, {
        number: groupJid,
        text: message,
      }, { headers: this.headers });
    } else {
      await axios.post(`${this.apiUrl}/message/sendMedia/${instanceKey}`, {
        number: groupJid,
        mediatype: mediaType?.toLowerCase(),
        media: mediaUrl,
        caption: message,
      }, { headers: this.headers });
    }
  }
}
