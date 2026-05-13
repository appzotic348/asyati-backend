import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray, IsBoolean, IsInt, IsMongoId, IsNotEmpty,
  IsOptional, IsString, Min,
} from 'class-validator';

const csv = ({ value }: { value: unknown }): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim())
    return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === true;

const toInt = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined;

const parseJsonArray = ({ value }: { value: unknown }) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const p = JSON.parse(value as string);
    return Array.isArray(p) ? p : [];
  } catch { return []; }
};

export class CreateProductDto {

  // ── Classification ────────────────────────────────────────────────────────
  @ApiProperty({ example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsMongoId()
  departmentId: string;

  @ApiProperty({ example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsMongoId()
  categoryId: string;

  @ApiPropertyOptional({ example: '665f1a2b3c4d5e6f7a8b9c0d', description: 'Brand ObjectId' })
  @IsOptional() @IsMongoId()
  brandId?: string;

  @ApiPropertyOptional({ example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsOptional() @IsMongoId()
  taxGuideId?: string;

  // ── Identifiers ───────────────────────────────────────────────────────────
  @ApiProperty({ example: 'VH-OXF-2024' })
  @IsString() @IsNotEmpty()
  sellerSkuId: string;

  @ApiPropertyOptional({ example: 'GRP-OXF-WHT' })
  @IsOptional() @IsString()
  groupId?: string;

  @ApiProperty({ example: 'Formal Oxford Shirt' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'VH-OXF-2024-001' })
  @IsOptional() @IsString()
  styleCode?: string;

  // ── Visibility ────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: false })
  @IsOptional() @Transform(toBool) @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @Transform(toBool) @IsBoolean()
  isSearchable?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @Transform(toBool) @IsBoolean()
  isFeatured?: boolean;

  // ── Logistics ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Transform(toInt) @IsInt() @Min(1)
  minimumOrderQuantity?: number;

  // ── Content ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Premium Oxford cotton shirt' })
  @IsOptional() @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Classic white Oxford shirt...' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ type: 'string', example: 'formal shirt,oxford shirt' })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  searchKeywords?: string[];

  @ApiPropertyOptional({ type: 'string', example: 'Cotton fabric,Machine washable' })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  keyFeatures?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  videoUrl?: string;

  // ── SEO ───────────────────────────────────────────────────────────────────
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?:       string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDescription?: string;

  @ApiPropertyOptional({ type: 'string', example: 'formal shirt,office wear' })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({
    type: 'string',
    description:
      'JSON array of `{ key, value, type? }` pairs.\n\n' +
      'type values: TEXT | NUMBER | BOOLEAN | ARRAY | COLOR | DIMENSION\n\n' +
      'Defaults to TEXT if omitted.',
    example: '[{"key":"Sleeve Length","value":"Full Sleeve","type":"TEXT"},{"key":"Pattern","value":"Solid"}]',
  })
  @IsOptional()
  @Transform(parseJsonArray)
  @IsArray()
  metadata?: Array<{ key: string; value: string; type?: string }>;

  @ApiPropertyOptional({
    type: 'string',
    description:
      'JSON array of variant objects.\n\n' +
      '**Required per variant:** `size`, `color`, `pricing.mrp`, `pricing.sellingPrice`\n\n' +
      '**Optional per variant:** `sku`, `barcode`, `stock`, `pricing.costPrice`, `shipping`, `status`\n\n' +
      'If `sku` is omitted it is auto-generated as `{sellerSkuId}-{COLOR}-{SIZE}`.',
    example: JSON.stringify([
      {
        size: 'M', color: 'White', title: 'White M', sku: 'VH-M-WHT',
        stock: 30, hsn: '6205',
        pricing: { mrp: 1799, sellingPrice: 1299, costPrice: 900 },
        shipping: { weightKg: 0.25, lengthCm: 35, breadthCm: 28, heightCm: 5 },
      },
      {
        size: 'XL', color: 'White', stock: 20, hsn: '6205',
        pricing: { mrp: 1899, sellingPrice: 1399 },
        shipping: { weightKg: 0.35, lengthCm: 42, breadthCm: 32, heightCm: 6 },
      },
    ]),
  })
  @IsOptional()
  @Transform(parseJsonArray)
  @IsArray()
  variants?: Array<{
    size:     string;
    color:    string;
    title?:   string;   
    sku?:     string;  
    barcode?: string;
    stock?:   number;
    hsn?:     string;   
    pricing:  { mrp: number; sellingPrice: number; costPrice?: number; currency?: string };
    shipping?: { weightKg?: number; lengthCm?: number; breadthCm?: number; heightCm?: number };
    status?:  string;
  }>;

  // ── Images ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  mainImage?: any;

  @ApiPropertyOptional({ type: 'string', example: 'FRONT,BACK,SIDE' })
  @IsOptional() @Transform(csv) @IsArray() @IsString({ each: true })
  otherImageTypes?: string[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' } })
  otherImages?: any[];

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  mainPaletteImage?: any;
}