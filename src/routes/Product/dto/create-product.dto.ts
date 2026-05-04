import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AdditionalGarments,
  BottomFabric,
  BottomType,
  Color,
  DetailPlacement,
  Fabric,
  IdealFor,
  KurtaStyleType,
  ListingStatus,
  Neck,
  Occasion,
  OrnamentationType,
  Pattern,
  PatternPrintType,
  Size,
  SleeveLength,
  SleeveStyle,
  SurfaceStyling,
  TopLength,
  TopType,
  Trend,
} from '../enums/product.enums';

const toStrArray = ({ value }: { value: unknown }): string[] => {
  if (Array.isArray(value)) return (value as unknown[]).map(String);
  if (typeof value === 'string' && value.trim())
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};

const toBool = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === 'true' || value === true || value === '1') return true;
  if (value === 'false' || value === false || value === '0') return false;
  return undefined;
};

const toNum = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? Number(value) : undefined;

const toInt = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined;

// ─── DTO ───────────────────────────────────────────────────────────────────

export class CreateProductDto {
  @ApiProperty({
    example: 'LIBAS-ANK-CTN-BLU-M',
    description: 'Unique Seller SKU ID (max 64 chars).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sellerSkuId: string;

  @ApiPropertyOptional({
    example: 'GRP-LIBAS-ANK-001',
    description: 'Group ID to link size/color variants.',
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({
    enum: ListingStatus,
    example: ListingStatus.INACTIVE,
    description:
      'Inactive listings are not visible to buyers. Default: Inactive.',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  listingStatus?: string;

  @ApiProperty({
    example: 2499,
    description: 'Maximum Retail Price in ₹ (positive integer).',
  })
  @Transform(toNum)
  @IsNumber()
  @Min(1)
  mrp: number;

  @ApiProperty({
    example: 1799,
    description: 'Your selling price in ₹. Must be ≤ MRP.',
  })
  @Transform(toNum)
  @IsNumber()
  @Min(1)
  sellingPrice: number;

  @ApiPropertyOptional({
    example: 'e-cart',
    description:
      'How inventory is procured to fulfill an order. Default: e-cart.',
  })
  @IsOptional()
  @IsString()
  procurementType?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Procurement SLA — days to keep product ready for dispatch.',
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  procurementSla?: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Available stock quantity.',
    minimum: 0,
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: 'Self',
    description: 'Who will ship the item to the customer.',
  })
  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Local handling fee in ₹ (same city). Default 0.',
    minimum: 0,
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  localHandlingFee?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Zonal handling fee in ₹. Default 0.',
    minimum: 0,
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  zonalHandlingFee?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'National handling fee in ₹. Default 0.',
    minimum: 0,
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  nationalHandlingFee?: number;

  @ApiPropertyOptional({ example: 38, description: 'Package length in cm.' })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @ApiPropertyOptional({ example: 30, description: 'Package breadth in cm.' })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  breadthCm?: number;

  @ApiPropertyOptional({ example: 6, description: 'Package height in cm.' })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  heightCm?: number;

  @ApiPropertyOptional({ example: 0.4, description: 'Package weight in kg.' })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiPropertyOptional({
    example: '6211',
    description: 'HSN code for tax classification.',
  })
  @IsOptional()
  @IsString()
  hsn?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Luxury cess rate if applicable (decimal, e.g. 0.5 for 0.5%).',
    minimum: 0,
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  luxuryCess?: number;

  @ApiPropertyOptional({ example: 'India', description: 'Country of origin.' })
  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @ApiPropertyOptional({
    example: 'Libas International, GIDC, Surat - 395004',
    description: 'Full manufacturer name and address.',
  })
  @IsOptional()
  @IsString()
  manufacturerDetails?: string;

  @ApiPropertyOptional({
    example: 'Libas International, GIDC, Surat - 395004',
    description: 'Full packer name and address.',
  })
  @IsOptional()
  @IsString()
  packerDetails?: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Importer details (required only for imported goods).',
  })
  @IsOptional()
  @IsString()
  importerDetails?: string;

  @ApiPropertyOptional({
    example: 'GST_5',
    description: 'GST tax code. e.g. GST_0, GST_5, GST_12, GST_18.',
  })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Minimum order quantity (positive integer). Default 1.',
    minimum: 1,
  })
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  minimumOrderQuantity?: number;

  @ApiProperty({ example: 'Libas', description: 'Brand name.' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({
    type: 'string',
    example: '1 Kurta,1 Palazzo,1 Dupatta',
    description:
      '**ARRAY** — pieces included in the set. ' +
      'Send as comma-separated string: `"1 Kurta,1 Palazzo,1 Dupatta"`. ' +
      'In Postman/code you can also repeat the field key for each value.',
  })
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  itemsIncluded: string[];

  @ApiProperty({
    enum: IdealFor,
    example: IdealFor.WOMEN,
    description: 'Target gender.',
  })
  @IsEnum(IdealFor)
  idealFor: string;

  @ApiProperty({ enum: SleeveLength, example: SleeveLength.THREE_QUARTER })
  @IsEnum(SleeveLength)
  sleeveLength: string;

  @ApiProperty({
    type: 'string',
    enum: Object.values(Pattern),
    example: 'Embroidered',
    description:
      '**ARRAY** — one or more patterns. Comma-separated: `"Embroidered,Self Design"`. ' +
      'Allowed: ' +
      Object.values(Pattern).join(' | '),
  })
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(Pattern, { each: true })
  pattern: string[];

  @ApiProperty({
    type: 'string',
    example: 'Pure Cotton',
    description:
      '**ARRAY — maximum 2 values.** Primary fabric(s). Comma-separated: `"Pure Cotton,Georgette"`. ' +
      'Allowed: ' +
      Object.values(Fabric).join(' | '),
  })
  @Transform(toStrArray)
  @IsArray()
  @ArrayMaxSize(2, { message: 'fabric accepts a maximum of 2 values' })
  @IsEnum(Fabric, { each: true })
  fabric: string[];

  @ApiProperty({
    enum: TopType,
    example: TopType.KURTA,
    description:
      'Type of the top garment. Men: Kurta|Kurti|NA|Sherwani|Shirt. Women: Crop Top|Ethnic Top|Kaftan|Kurta|Kurti|NA|Shirt.',
  })
  @IsEnum(TopType)
  topType: string;

  @ApiProperty({
    enum: BottomType,
    example: BottomType.PALAZZO,
    description:
      'Type of the bottom garment. Men: Dhoti|Dhoti Pant|NA|Pant|Pyjama|Salwar. Women: Churidar|Dhoti Pant|NA|Palazzo|Pant|Patiala|Pyjama|Salwar|Sari Pant|Sharara|Skirt.',
  })
  @IsEnum(BottomType)
  bottomType: string;

  @ApiPropertyOptional({
    enum: AdditionalGarments,
    example: AdditionalGarments.DUPATTA,
    description: 'Single additional garment (if any). Use NA for none.',
  })
  @IsOptional()
  @IsEnum(AdditionalGarments)
  additionalGarments?: string;

  @ApiProperty({ enum: Size, example: Size.M, description: 'Product size.' })
  @IsEnum(Size)
  size: string;

  @ApiPropertyOptional({
    example: 'Regular',
    description: 'Size measuring convention: Regular (S/M/L) or Number.',
  })
  @IsOptional()
  @IsString()
  sizeMeasuringUnit?: string;

  @ApiProperty({
    example: 'LIBAS-ANK-2024-001',
    description: 'Style code — shared by all size variants of the same design.',
  })
  @IsString()
  @IsNotEmpty()
  styleCode: string;

  @ApiProperty({
    type: 'string',
    example: 'Blue',
    description:
      '**ARRAY** — primary color(s). Comma-separated: `"Blue,Gold"`. ' +
      'Allowed: ' +
      Object.values(Color).join(' | '),
  })
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(Color, { each: true })
  color: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Royal Indigo',
    description:
      '**ARRAY** — brand-specific color names (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  brandColor?: string[];

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Main product image — **required**. jpg/png/webp, max 5 MB.',
  })
  mainImage: any;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Up to **5** additional images. jpg/png/webp, max 5 MB each. Sending more than 5 returns a 400 error.',
  })
  otherImages?: any[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'Palette/swatch image — optional. Uploaded to Cloudinary. jpg/png/webp, max 5 MB.',
  })
  mainPaletteImage?: any;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Festive & Party',
    description:
      '**ARRAY** — occasion(s). Comma-separated. Allowed: ' +
      Object.values(Occasion).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(Occasion, { each: true })
  occasion?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Pure Cotton',
    description:
      '**ARRAY** — top garment fabric(s). Comma-separated. ' +
      'Allowed: Art Silk | Cotton | Cotton Blend | Crepe | Georgette | Modal | Net | ' +
      'Poly Crepe | Polyester | Pure Cotton | Rayon | Silk Blend | Velvet | Viscose. ' +
      '(Note: Pure Cotton is valid for top fabric even though it is not in the bottom fabric list.)',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  topFabric?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Cotton,Georgette',
    description:
      '**ARRAY** — bottom fabric(s). Comma-separated. Allowed: ' +
      Object.values(BottomFabric).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(BottomFabric, { each: true })
  bottomFabric?: string[];

  @ApiPropertyOptional({
    enum: KurtaStyleType,
    example: KurtaStyleType.ANARKALI,
  })
  @IsOptional()
  @IsEnum(KurtaStyleType)
  kurtaStyleType?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Thread Work,Mirror Work',
    description:
      '**ARRAY** — ornamentation types. Comma-separated. Allowed: ' +
      Object.values(OrnamentationType).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(OrnamentationType, { each: true })
  ornamentationType?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Gold',
    description:
      '**ARRAY** — secondary/accent colors. Comma-separated. Allowed: ' +
      Object.values(Color).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(Color, { each: true })
  secondaryColor?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Gentle hand wash,Dry in shade',
    description:
      '**ARRAY** — fabric care instructions (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  fabricCare?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Cotton',
    description: '**ARRAY** — lining material(s) (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  liningMaterial?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Single Jersey',
    description: '**ARRAY** — knit types (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  knitType?: string[];

  @ApiPropertyOptional({
    enum: Neck,
    example: Neck.V_NECK,
    description: 'Neckline type. Use NA if not applicable.',
  })
  @IsOptional()
  @IsEnum(Neck)
  neck?: string;

  @ApiPropertyOptional({
    example: 'https://youtube.com/...',
    description: 'Product video URL.',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Chikankari',
    description:
      '**ARRAY** — trend categories. Comma-separated. Allowed: ' +
      Object.values(Trend).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(Trend, { each: true })
  trend?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Floral,Embroidered',
    description:
      '**ARRAY** — pattern/print types. Comma-separated. Allowed: ' +
      Object.values(PatternPrintType).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(PatternPrintType, { each: true })
  patternPrintType?: string[];

  @ApiPropertyOptional({
    enum: SleeveStyle,
    example: SleeveStyle.BELL,
    description: 'Sleeve style. Use NA if not applicable.',
  })
  @IsOptional()
  @IsEnum(SleeveStyle)
  sleeveStyle?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Neckline,Yoke',
    description:
      '**ARRAY** — detail placements. Comma-separated. Allowed: ' +
      Object.values(DetailPlacement).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(DetailPlacement, { each: true })
  detailPlacement?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Ruffle',
    description:
      '**ARRAY** — surface styling elements. Comma-separated. Allowed: ' +
      Object.values(SurfaceStyling).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(SurfaceStyling, { each: true })
  surfaceStyling?: string[];

  @ApiPropertyOptional({
    example: 'true',
    type: 'string',
    description: 'Does the set include a dupatta? Send "true" or "false".',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  dupattalIncluded?: boolean;

  @ApiPropertyOptional({
    example: '3',
    description: 'Total number of garment pieces.',
  })
  @IsOptional()
  @IsString()
  netQuantity?: string;

  @ApiPropertyOptional({
    example: 'false',
    type: 'string',
    description: 'Is this a co-ord set? Send "true" or "false".',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  coOrdSet?: boolean;

  @ApiPropertyOptional({
    example: '8901234567890',
    description: 'EAN/UPC barcode number.',
  })
  @IsOptional()
  @IsString()
  ean?: string;

  @ApiPropertyOptional({
    example: 'EAN',
    description: 'Unit for the EAN/UPC value. e.g. EAN, UPC.',
  })
  @IsOptional()
  @IsString()
  eanMeasuringUnit?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Stitched and ready to wear,Comes with inner lining',
    description:
      '**ARRAY** — other product details (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  otherDetails?: string[];

  @ApiPropertyOptional({
    example: 'Elegant Anarkali kurta in pure cotton...',
    description: 'Full product description.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'anarkali kurta,ethnic set,cotton kurta',
    description: '**ARRAY** — SEO search keywords (max 5). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  searchKeywords?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Pure cotton fabric,Includes dupatta,Regular fit',
    description:
      '**ARRAY** — key product highlights shown as bullet points. Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  keyFeatures?: string[];

  @ApiPropertyOptional({
    enum: TopLength,
    example: TopLength.CALF_LENGTH,
    description: 'Length of the top garment. Use NA if not applicable.',
  })
  @IsOptional()
  @IsEnum(TopLength)
  topLength?: string;

  @ApiPropertyOptional({
    example: 'Regular Fit',
    description: 'Fit type e.g. Slim Fit, Regular Fit, Relaxed Fit.',
  })
  @IsOptional()
  @IsString()
  fit?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Flared silhouette,Side slits',
    description: '**ARRAY** — style notes (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  style?: string[];

  @ApiPropertyOptional({
    example: 'true',
    type: 'string',
    description:
      'Does the garment have an inner lining? Send "true" or "false".',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  lining?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Elastic,Drawstring',
    description: '**ARRAY** — waistband type(s) (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  waistband?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Floral embroidery on yoke,Gotta Patti border',
    description:
      '**ARRAY** — design highlight notes (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  design?: string[];
}
