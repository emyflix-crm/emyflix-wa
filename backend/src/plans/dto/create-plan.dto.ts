import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() price: number;
  @IsNumber() @Min(1) maxMessagesPerDay: number;
  @IsNumber() @Min(1) maxGroups: number;
  @IsNumber() @Min(1) maxCampaigns: number;
  @IsNumber() @Min(1) maxInstances: number;
  @IsOptional() features?: any;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class UpdatePlanDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() @Min(1) maxMessagesPerDay?: number;
  @IsOptional() @IsNumber() @Min(1) maxGroups?: number;
  @IsOptional() @IsNumber() @Min(1) maxCampaigns?: number;
  @IsOptional() @IsNumber() @Min(1) maxInstances?: number;
  @IsOptional() features?: any;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
}
