import {
  IsString, IsUUID, IsArray, IsEnum, IsOptional, IsInt,
  IsDateString, IsUrl, Min, Max, ArrayMinSize, MinLength,
} from 'class-validator';

export enum RecurrenceType { ONCE = 'ONCE', DAILY = 'DAILY', WEEKLY = 'WEEKLY', MONTHLY = 'MONTHLY' }
export enum MediaType { TEXT = 'TEXT', IMAGE = 'IMAGE', VIDEO = 'VIDEO', AUDIO = 'AUDIO', DOCUMENT = 'DOCUMENT' }

export class CreateCampaignDto {
  @IsUUID() instanceId: string;
  @IsString() @MinLength(1) name: string;
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) groupIds: string[];
  @IsString() @MinLength(1) message: string;
  @IsOptional() @IsUrl() mediaUrl?: string;
  @IsOptional() @IsEnum(MediaType) mediaType?: MediaType = MediaType.TEXT;
  @IsEnum(RecurrenceType) recurrenceType: RecurrenceType;
  @IsOptional() @IsArray() @IsInt({ each: true }) recurrenceDays?: number[];
  @IsOptional() @IsInt() @Min(1) @Max(31) recurrenceDay?: number;
  @IsString() timezone: string = 'America/Sao_Paulo';
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsInt() @Min(1) intervalMinutes?: number = 1;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) message?: string;
  @IsOptional() @IsUrl() mediaUrl?: string;
  @IsOptional() @IsEnum(MediaType) mediaType?: MediaType;
  @IsOptional() @IsEnum(RecurrenceType) recurrenceType?: RecurrenceType;
  @IsOptional() @IsArray() @IsInt({ each: true }) recurrenceDays?: number[];
  @IsOptional() @IsInt() @Min(1) @Max(31) recurrenceDay?: number;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsInt() @Min(1) intervalMinutes?: number;
}
