import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private from: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.from = this.configService.get<string>('RESEND_FROM') || 'noreply@emyflix.com';
  }

  async sendVerificationEmail(to: string, name: string, token: string, baseUrl: string) {
    const link = `${baseUrl}/verify-email?token=${token}`;
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Verify your EMYFLIX WA Account',
      html: `
        <div style="background-color:#111827;color:#f3f4f6;padding:20px;font-family:sans-serif;">
          <h1 style="color:#6366f1;">Welcome to EMYFLIX WA, ${name}!</h1>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${link}" style="display:inline-block;background-color:#6366f1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Verify Email</a>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string, baseUrl: string) {
    const link = `${baseUrl}/reset-password?token=${token}`;
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Reset your EMYFLIX WA Password',
      html: `
        <div style="background-color:#111827;color:#f3f4f6;padding:20px;font-family:sans-serif;">
          <h1 style="color:#6366f1;">Hello ${name},</h1>
          <p>You requested to reset your password. Click the link below to set a new one:</p>
          <a href="${link}" style="display:inline-block;background-color:#6366f1;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(to: string, name: string) {
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Welcome aboard to EMYFLIX WA!',
      html: `
        <div style="background-color:#111827;color:#f3f4f6;padding:20px;font-family:sans-serif;">
          <h1 style="color:#6366f1;">You're all set, ${name}!</h1>
          <p>Your email has been verified. Enjoy your 7-day trial!</p>
        </div>
      `,
    });
  }
}
