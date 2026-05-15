import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt,
  IsMongoId, IsNotEmpty, IsNumber, IsOptional,
  IsString, Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination';
import {
  PromotionPlacement, PromotionStatus,
  PromotionTarget, PromotionType,
} from '../schemas/promotion.schema';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === true;

const toInt = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined;

const csv = ({ value }: { value: unknown }): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim())
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

export class CreatePromotionDto {
  @ApiProperty({ example: 'Summer Sale Banner' })
  @IsString() @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Q3 homepage hero — remove after 30 Sep' })
  @IsOptional() @IsString()
  internalNote?: string;

  @ApiProperty({ enum: PromotionType, example: PromotionType.BANNER })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({ enum: PromotionPlacement, example: PromotionPlacement.HOME_HERO })
  @IsEnum(PromotionPlacement)
  placement: PromotionPlacement;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Desktop banner image' })
  image?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Mobile banner image (optional)' })
  mobileImage?: any;

  @ApiPropertyOptional({ example: 'Up to 50% Off | Summer Sale is Live!' })
  @IsOptional() @IsString()
  headline?: string;

  @ApiPropertyOptional({ example: 'Use code SUMMER50 at checkout' })
  @IsOptional() @IsString()
  subHeadline?: string;

  @ApiPropertyOptional({ example: 'Shop Now' })
  @IsOptional() @IsString()
  buttonText?: string;

  @ApiPropertyOptional({ example: '/collections/summer-sale' })
  @IsOptional() @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @Transform(toBool) @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional({
    example: '<p>Sign up and get <b>10% off</b> your first order!</p>',
    description: 'HTML / plain text for popup and strip body.',
  })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: 'SUMMER50',
    description: 'Attach a coupon code to display on this promotion.',
  })
  @IsOptional() @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-09-30' })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: PromotionTarget, example: PromotionTarget.ALL })
  @IsOptional() @IsEnum(PromotionTarget)
  target?: PromotionTarget;

  @ApiPropertyOptional({ type: 'string', description: 'Comma-separated category ObjectIds' })
  @IsOptional() @Transform(csv) @IsArray() @IsMongoId({ each: true })
  targetCategories?: string[];

  @ApiPropertyOptional({ type: 'string', description: 'Comma-separated department ObjectIds' })
  @IsOptional() @Transform(csv) @IsArray() @IsMongoId({ each: true })
  targetDepartments?: string[];

  @ApiPropertyOptional({ example: 3, description: 'Delay in seconds before popup appears.' })
  @IsOptional() @Transform(toInt) @IsInt() @Min(0)
  popupDelay?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Transform(toInt) @IsInt() @Min(0)
  popupFrequency?: number;

  @ApiPropertyOptional({ example: 7, description: 'Days before popup is shown again to same visitor.' })
  @IsOptional() @Transform(toInt) @IsInt() @Min(0)
  popupCooldownDays?: number;

  @ApiPropertyOptional({ example: 1, description: 'Display order. Lower = shown first.' })
  @IsOptional() @Transform(toInt) @IsInt() @Min(0)
  sortOrder?: number;
}

export class UpdatePromotionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  internalNote?: string;

  @ApiPropertyOptional({ enum: PromotionPlacement })
  @IsOptional() @IsEnum(PromotionPlacement)
  placement?: PromotionPlacement;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  image?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  mobileImage?: any;

  @ApiPropertyOptional() @IsOptional() @IsString()
  headline?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  subHeadline?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  buttonText?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  linkUrl?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  couponCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: PromotionTarget })
  @IsOptional() @IsEnum(PromotionTarget)
  target?: PromotionTarget;

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional() @Transform(csv) @IsArray() @IsMongoId({ each: true })
  targetCategories?: string[];

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional() @Transform(csv) @IsArray() @IsMongoId({ each: true })
  targetDepartments?: string[];

  @ApiPropertyOptional() @IsOptional() @Transform(toInt) @IsInt() @Min(0)
  popupDelay?: number;

  @ApiPropertyOptional() @IsOptional() @Transform(toInt) @IsInt() @Min(0)
  popupFrequency?: number;

  @ApiPropertyOptional() @IsOptional() @Transform(toInt) @IsInt() @Min(0)
  popupCooldownDays?: number;

  @ApiPropertyOptional() @IsOptional() @Transform(toInt) @IsInt() @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['Active', 'Inactive'] })
  @IsOptional() @IsEnum(['Active', 'Inactive'])
  status?: string;
}

export class FilterPromotionsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PromotionType })
  @IsOptional() @IsEnum(PromotionType)
  type?: string;

  @ApiPropertyOptional({ enum: PromotionPlacement })
  @IsOptional() @IsEnum(PromotionPlacement)
  placement?: string;

  @ApiPropertyOptional({ enum: PromotionStatus })
  @IsOptional() @IsEnum(PromotionStatus)
  status?: string;

  @ApiPropertyOptional({ description: 'Search by title or internalNote' })
  @IsOptional() @IsString()
  search?: string;
}

export class FetchActivePromotionsDto {
  @ApiPropertyOptional({
    enum: PromotionPlacement,
    description: 'Filter by placement slot. Omit to get all active promotions.',
  })
  @IsOptional() @IsEnum(PromotionPlacement)
  placement?: string;

  @ApiPropertyOptional({ enum: PromotionType })
  @IsOptional() @IsEnum(PromotionType)
  type?: string;
}