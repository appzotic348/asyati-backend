import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray, IsBoolean, IsInt, IsMongoId, IsNotEmpty,
  IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

const csv = ({ value }: { value: unknown }): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim())
    return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

const toNum = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? Number(value) : undefined;

const toInt = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined;

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === true;

const parseJson = (fallback: any) => ({ value }: { value: unknown }) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  try {
    const p = JSON.parse(value as string);
    return Array.isArray(p) ? p : fallback;
  } catch { return undefined; }
};

export class UpdateProductDto {

  @ApiPropertyOptional() @IsOptional() @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional() @IsOptional() @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsMongoId()
  taxGuideId?: string;

  @ApiPropertyOptional({ example: 'Active', enum: ['Active', 'Inactive'] })
  @IsOptional() @IsString()
  listingStatus?: string;

  @ApiPropertyOptional({ example: '665f1a2b3c4d5e6f7a8b9c0d', description: 'Brand ObjectId' })
  @IsOptional() @IsMongoId()
  brandId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  styleCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  groupId?: string;

  // ── Listing visibility ────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean()
  isSearchable?: boolean;

  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean()
  isFeatured?: boolean;

  // ── Flags ─────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean()
  isDraft?: boolean;

  // ── Pricing ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @Transform(toNum) @IsNumber() @Min(1)
  mrp?: number;

  @ApiPropertyOptional() @IsOptional() @Transform(toNum) @IsNumber() @Min(1)
  sellingPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  hsn?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(toInt) @IsInt() @Min(1)
  minimumOrderQuantity?: number;

  // ── Content ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString()
  shortDescription?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  searchKeywords?: string[];

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  keyFeatures?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  videoUrl?: string;

  // ── SEO ───────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString()
  metaTitle?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  metaKeywords?: string[];

  // ── Metadata ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    type: 'string',
    description: 'Full replacement of metadata array — JSON string',
    example: '[{"key":"Pattern","value":"Solid"}]',
  })
  @IsOptional()
  @Transform(parseJson(undefined))
  @IsArray()
  metadata?: Array<{ key: string; value: string }>;

  // ── Images ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  mainImage?: any;

  @ApiPropertyOptional({
    type: 'string',
    example: 'FRONT,SIDE',
    description: 'Send BEFORE addOtherImages. Type labels positionally matched.',
  })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  addOtherImageTypes?: string[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' } })
  addOtherImages?: any[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'products/others/abc-123,products/others/def-456',
    description: 'Comma-separated Cloudinary publicIds to remove',
  })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  removeOtherImages?: string[];

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  mainPaletteImage?: any;
}