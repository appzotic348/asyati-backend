import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt,
  IsMongoId, IsNotEmpty, IsNumber, IsOptional,
  IsString, Max, Min, ValidateIf,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination';
import { CouponScope, DiscountType } from '../schemas/coupon.schema';

const toNum = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? Number(value) : undefined;

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === true;

// ── Create Coupon ─────────────────────────────────────────────────────────────

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20', description: 'Unique coupon code (uppercase).' })
  @IsString() @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: '20% off on all orders above ₹999' })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({
    example: 20,
    description: 'Percentage (1–100) for Percentage type, flat INR for Flat type. Ignored for FreeShipping.',
  })
  @IsNumber() @Min(0)
  discountValue: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Max discount cap in INR for Percentage type (e.g. max ₹500). Leave null for no cap.',
  })
  @IsOptional() @IsNumber() @Min(0)
  maxDiscountAmount?: number;

  @ApiProperty({ enum: CouponScope, example: CouponScope.ALL })
  @IsEnum(CouponScope)
  scope: CouponScope;

  @ApiPropertyOptional({
    type: [String],
    description: 'Required when scope = Product. Array of product ObjectIds.',
  })
  @ValidateIf((o) => o.scope === CouponScope.PRODUCT)
  @IsArray() @IsMongoId({ each: true })
  applicableProducts?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Required when scope = Category. Array of category ObjectIds.',
  })
  @ValidateIf((o) => o.scope === CouponScope.CATEGORY)
  @IsArray() @IsMongoId({ each: true })
  applicableCategories?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Required when scope = Department. Array of department ObjectIds.',
  })
  @ValidateIf((o) => o.scope === CouponScope.DEPARTMENT)
  @IsArray() @IsMongoId({ each: true })
  applicableDepartments?: string[];

  @ApiPropertyOptional({ example: 999, description: 'Minimum cart subtotal to apply coupon.' })
  @IsOptional() @IsNumber() @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Max cart value. 0 = no limit.' })
  @IsOptional() @IsNumber() @Min(0)
  maxOrderValue?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Total redemptions allowed. 0 = unlimited.' })
  @IsOptional() @IsInt() @Min(0)
  totalUsageLimit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Per-customer redemption limit. 0 = unlimited.' })
  @IsOptional() @IsInt() @Min(0)
  perCustomerLimit?: number;

  @ApiProperty({ example: '2025-01-01', description: 'Coupon valid from (ISO date).' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-12-31', description: 'Coupon valid until (ISO date).' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: false, description: 'Restrict to first-time buyers only.' })
  @IsOptional() @IsBoolean()
  firstTimeOnly?: boolean;
}

// ── Update Coupon ─────────────────────────────────────────────────────────────

export class UpdateCouponDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional() @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  discountValue?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ enum: CouponScope })
  @IsOptional() @IsEnum(CouponScope)
  scope?: CouponScope;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsMongoId({ each: true })
  applicableProducts?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsMongoId({ each: true })
  applicableCategories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsMongoId({ each: true })
  applicableDepartments?: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  maxOrderValue?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  totalUsageLimit?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  perCustomerLimit?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ['Active', 'Inactive'] })
  @IsOptional() @IsEnum(['Active', 'Inactive'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  firstTimeOnly?: boolean;
}

// ── Apply Coupon ────────────────────────────────────────────

export class ApplyCouponDto {
  @ApiProperty({ example: 'SAVE20', description: 'Coupon code to apply.' })
  @IsString() @IsNotEmpty()
  code: string;
}

// ── Coupon filter  ────────────────────────────────────────────────

export class FilterCouponsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['Active', 'Inactive', 'Expired'] })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: CouponScope })
  @IsOptional() @IsEnum(CouponScope)
  scope?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional() @IsEnum(DiscountType)
  discountType?: string;

  @ApiPropertyOptional({ description: 'Search by code or description' })
  @IsOptional() @IsString()
  search?: string;
}