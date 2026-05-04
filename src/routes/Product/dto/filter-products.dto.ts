import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  AdditionalGarments,
  BottomType,
  Color,
  Fabric,
  IdealFor,
  KurtaStyleType,
  ListingStatus,
  Neck,
  Occasion,
  Pattern,
  Size,
  SleeveLength,
  SleeveStyle,
  TopLength,
  TopType,
  Trend,
} from '../enums/product.enums';

const toNum = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? Number(value) : undefined;

const toInt = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined;

export class FilterProductsDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number. Default: 1.' })
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Items per page. Default: 10. Max: 100.',
  })
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    enum: ListingStatus,
    example: ListingStatus.ACTIVE,
    description: 'Filter by listing status.',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  listingStatus?: string;

  @ApiPropertyOptional({
    example: 500,
    description: 'Minimum MRP in ₹ (inclusive).',
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  mrpMin?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Maximum MRP in ₹ (inclusive).',
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  mrpMax?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Minimum selling price in ₹ (inclusive).',
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  sellingPriceMin?: number;

  @ApiPropertyOptional({
    example: 3000,
    description: 'Maximum selling price in ₹ (inclusive).',
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  sellingPriceMax?: number;

  @ApiPropertyOptional({
    example: 'Libas',
    description: 'Filter by brand (case-insensitive partial match).',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    enum: IdealFor,
    example: IdealFor.WOMEN,
    description: 'Filter by target gender.',
  })
  @IsOptional()
  @IsEnum(IdealFor)
  idealFor?: string;

  @ApiPropertyOptional({
    enum: SleeveLength,
    example: SleeveLength.THREE_QUARTER,
    description: 'Filter by sleeve length.',
  })
  @IsOptional()
  @IsEnum(SleeveLength)
  sleeveLength?: string;

  @ApiPropertyOptional({
    enum: Pattern,
    example: Pattern.EMBROIDERED,
    description: 'Filter by pattern (matches if array contains this value).',
  })
  @IsOptional()
  @IsEnum(Pattern)
  pattern?: string;

  @ApiPropertyOptional({
    enum: Fabric,
    example: Fabric.PURE_COTTON,
    description:
      'Filter by fabric (matches if array contains this value). Max 2 stored per product.',
  })
  @IsOptional()
  @IsEnum(Fabric)
  fabric?: string;

  @ApiPropertyOptional({
    enum: TopType,
    example: TopType.KURTA,
    description: 'Filter by top garment type.',
  })
  @IsOptional()
  @IsEnum(TopType)
  topType?: string;

  @ApiPropertyOptional({
    enum: BottomType,
    example: BottomType.PALAZZO,
    description: 'Filter by bottom garment type.',
  })
  @IsOptional()
  @IsEnum(BottomType)
  bottomType?: string;

  @ApiPropertyOptional({
    enum: AdditionalGarments,
    example: AdditionalGarments.DUPATTA,
    description: 'Filter by additional garment included.',
  })
  @IsOptional()
  @IsEnum(AdditionalGarments)
  additionalGarments?: string;

  @ApiPropertyOptional({
    enum: Size,
    example: Size.M,
    description: 'Filter by size.',
  })
  @IsOptional()
  @IsEnum(Size)
  size?: string;

  @ApiPropertyOptional({
    enum: Color,
    example: 'Blue',
    description:
      'Filter by color (matches if color array contains this value).',
  })
  @IsOptional()
  @IsEnum(Color)
  color?: string;

  @ApiPropertyOptional({
    enum: Occasion,
    example: Occasion.FESTIVE_PARTY,
    description: 'Filter by occasion.',
  })
  @IsOptional()
  @IsEnum(Occasion)
  occasion?: string;

  @ApiPropertyOptional({
    enum: KurtaStyleType,
    example: KurtaStyleType.ANARKALI,
    description: 'Filter by kurta style type.',
  })
  @IsOptional()
  @IsEnum(KurtaStyleType)
  kurtaStyleType?: string;

  @ApiPropertyOptional({
    enum: Neck,
    example: Neck.V_NECK,
    description: 'Filter by neckline type.',
  })
  @IsOptional()
  @IsEnum(Neck)
  neck?: string;

  @ApiPropertyOptional({
    enum: Trend,
    example: Trend.CHIKANKARI,
    description: 'Filter by trend category.',
  })
  @IsOptional()
  @IsEnum(Trend)
  trend?: string;

  @ApiPropertyOptional({
    enum: SleeveStyle,
    example: SleeveStyle.BELL,
    description: 'Filter by sleeve style.',
  })
  @IsOptional()
  @IsEnum(SleeveStyle)
  sleeveStyle?: string;

  @ApiPropertyOptional({
    enum: TopLength,
    example: TopLength.CALF_LENGTH,
    description: 'Filter by top garment length.',
  })
  @IsOptional()
  @IsEnum(TopLength)
  topLength?: string;

  @ApiPropertyOptional({
    example: 'true',
    type: 'string',
    description: 'Filter by dupatta included. Send "true" or "false".',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  dupattalIncluded?: boolean;

  @ApiPropertyOptional({
    example: 'false',
    type: 'string',
    description: 'Filter by co-ord set. Send "true" or "false".',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  coOrdSet?: boolean;

  @ApiPropertyOptional({
    example: 'anarkali',
    description:
      'Full-text search across: brand, sellerSkuId, styleCode, description, searchKeywords. Case-insensitive.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'sellingPrice',
    enum: ['mrp', 'sellingPrice', 'stock', 'createdAt', 'brand'],
    description: 'Field to sort by. Default: createdAt.',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'asc',
    enum: ['asc', 'desc'],
    description: 'Sort direction. Default: desc.',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
