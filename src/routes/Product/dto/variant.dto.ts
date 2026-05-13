import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsString, Min, ValidateNested,
} from 'class-validator';

const toNum = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? Number(value) : undefined;

// ── Pricing sub-DTO ───────────────────────────────────────────────────────────
export class VariantPricingDto {
  @ApiProperty({ example: 1799 })
  @Transform(toNum) @IsNumber() @Min(1)
  mrp: number;

  @ApiProperty({ example: 1299 })
  @Transform(toNum) @IsNumber() @Min(1)
  sellingPrice: number;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional() @IsString()
  currency?: string;
}

// ── Shipping sub-DTO ──────────────────────────────────────────────────────────
export class ShippingDto {
  @ApiPropertyOptional({ example: 0.28 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  weightKg?: number;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  lengthCm?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  breadthCm?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  heightCm?: number;
}

// ── Add Variant ───────────────────────────────────────────────────────────────
export class AddVariantDto {
  @ApiProperty({ example: 'XL' })
  @IsString() @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 'White' })
  @IsString() @IsNotEmpty()
  color: string;

  @ApiPropertyOptional({
    example: 'White XL',
    description: 'Display title for this variant. Auto-generated as "{color} / {size}" if omitted.',
  })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'VH-XL-WHT',
    description: 'Variant-level SKU. Auto-generated as "{sellerSkuId}-{COLOR}-{SIZE}" if omitted.',
  })
  @IsOptional() @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: '8901234567002' })
  @IsOptional() @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 0, description: 'Initial stock. Default 0.' })
  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: '6205', description: 'HSN code for this variant.' })
  @IsOptional() @IsString()
  hsn?: string;

  @ApiProperty({
    type: VariantPricingDto,
    description: 'Pricing is REQUIRED per variant. Each variant has its own mrp and sellingPrice.',
  })
  @ValidateNested()
  @Type(() => VariantPricingDto)
  pricing: VariantPricingDto;

  @ApiPropertyOptional({ type: ShippingDto })
  @IsOptional() @ValidateNested() @Type(() => ShippingDto)
  shipping?: ShippingDto;

  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'],
  })
  @IsOptional() @IsString()
  status?: string;
}

// ── Update Variant ────────────────────────────────────────────────────────────
export class UpdateVariantDto {
  @ApiPropertyOptional({ example: 'XL' })
  @IsOptional() @IsString() @IsNotEmpty()
  size?: string;

  @ApiPropertyOptional({ example: 'Blue' })
  @IsOptional() @IsString() @IsNotEmpty()
  color?: string;

  @ApiPropertyOptional({
    example: 'Blue XL',
    description: 'Override the display title. If omitted and size/color changed, title is auto-rebuilt.',
  })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'VH-XL-BLU' })
  @IsOptional() @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: '8901234567003' })
  @IsOptional() @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: '6205', description: 'HSN code for this variant.' })
  @IsOptional() @IsString()
  hsn?: string;

  @ApiPropertyOptional({ type: VariantPricingDto })
  @IsOptional() @ValidateNested() @Type(() => VariantPricingDto)
  pricing?: VariantPricingDto;

  @ApiPropertyOptional({ type: ShippingDto })
  @IsOptional() @ValidateNested() @Type(() => ShippingDto)
  shipping?: ShippingDto;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'] })
  @IsOptional() @IsString()
  status?: string;
}