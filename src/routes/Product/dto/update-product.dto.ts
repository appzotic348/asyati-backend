import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
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

export class UpdateProductDto {
  @ApiPropertyOptional({ enum: ListingStatus, example: ListingStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ListingStatus)
  listingStatus?: string;

  @ApiPropertyOptional({ example: 2499 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(1)
  mrp?: number;

  @ApiPropertyOptional({ example: 1799 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(1)
  sellingPrice?: number;

  @ApiPropertyOptional({
    example: 'e-cart',
    description: 'How inventory is procured. Default: e-cart.',
  })
  @IsOptional()
  @IsString()
  procurementType?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Days to keep product ready for dispatch.',
  })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  procurementSla?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 'Self' })
  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  localHandlingFee?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  zonalHandlingFee?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  nationalHandlingFee?: number;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  breadthCm?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  heightCm?: number;

  @ApiPropertyOptional({ example: 0.4 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiPropertyOptional({ example: '6211' })
  @IsOptional()
  @IsString()
  hsn?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(toNum)
  @IsNumber()
  @Min(0)
  luxuryCess?: number;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @ApiPropertyOptional({ example: 'Libas International, Surat' })
  @IsOptional()
  @IsString()
  manufacturerDetails?: string;

  @ApiPropertyOptional({ example: 'Libas International, Surat' })
  @IsOptional()
  @IsString()
  packerDetails?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  importerDetails?: string;

  @ApiPropertyOptional({ example: 'GST_5' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  minimumOrderQuantity?: number;

  @ApiPropertyOptional({ example: 'Libas' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: '1 Kurta,1 Palazzo,1 Dupatta',
    description: '**ARRAY** — comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  itemsIncluded?: string[];

  @ApiPropertyOptional({ enum: IdealFor, example: IdealFor.WOMEN })
  @IsOptional()
  @IsEnum(IdealFor)
  idealFor?: string;

  @ApiPropertyOptional({
    enum: SleeveLength,
    example: SleeveLength.THREE_QUARTER,
  })
  @IsOptional()
  @IsEnum(SleeveLength)
  sleeveLength?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Embroidered',
    description:
      '**ARRAY** — comma-separated. Allowed: ' +
      Object.values(Pattern).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(Pattern, { each: true })
  pattern?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Pure Cotton',
    description:
      '**ARRAY — max 2 values.** Comma-separated. Allowed: ' +
      Object.values(Fabric).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @ArrayMaxSize(2, { message: 'fabric accepts a maximum of 2 values' })
  @IsEnum(Fabric, { each: true })
  fabric?: string[];

  @ApiPropertyOptional({ enum: TopType, example: TopType.KURTA })
  @IsOptional()
  @IsEnum(TopType)
  topType?: string;

  @ApiPropertyOptional({ enum: BottomType, example: BottomType.PALAZZO })
  @IsOptional()
  @IsEnum(BottomType)
  bottomType?: string;

  @ApiPropertyOptional({
    enum: AdditionalGarments,
    example: AdditionalGarments.DUPATTA,
  })
  @IsOptional()
  @IsEnum(AdditionalGarments)
  additionalGarments?: string;

  @ApiPropertyOptional({ enum: Size, example: Size.L })
  @IsOptional()
  @IsEnum(Size)
  size?: string;

  @ApiPropertyOptional({ example: 'Regular' })
  @IsOptional()
  @IsString()
  sizeMeasuringUnit?: string;

  @ApiPropertyOptional({ example: 'LIBAS-ANK-2024-001' })
  @IsOptional()
  @IsString()
  styleCode?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Blue',
    description:
      '**ARRAY** — comma-separated. Allowed: ' +
      Object.values(Color).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(Color, { each: true })
  color?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Royal Indigo',
    description: '**ARRAY** — brand color names (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  brandColor?: string[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'New main image — replaces current (old deleted from Cloudinary).',
  })
  mainImage?: any;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      '**Add** new other images (up to 5 total after add). ' +
      'Combined with `removeOtherImages` in the same request — removes happen first, then these are added.',
  })
  addOtherImages?: any[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'products/main/abc-123,products/others/def-456',
    description:
      '**ARRAY of publicIds** to remove from otherImages. Comma-separated. ' +
      'e.g. `"products/others/image1-123,products/others/image2-456"`. ' +
      'Removal happens before addOtherImages is processed.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  removeOtherImages?: string[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'New palette/swatch image — replaces existing (old deleted from Cloudinary).',
  })
  mainPaletteImage?: any;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Festive & Party',
    description:
      '**ARRAY** — comma-separated. Allowed: ' +
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
      '**ARRAY** — top garment fabric(s). Comma-separated. Allowed: Art Silk | Cotton | Cotton Blend | Crepe | Georgette | Modal | Net | Poly Crepe | Polyester | Pure Cotton | Rayon | Silk Blend | Velvet | Viscose.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  topFabric?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Cotton,Rayon',
    description:
      '**ARRAY** — comma-separated. Allowed: ' +
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
      '**ARRAY** — comma-separated. Allowed: ' +
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
      '**ARRAY** — comma-separated. Allowed: ' +
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
    description: '**ARRAY** — lining materials (free text). Comma-separated.',
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

  @ApiPropertyOptional({ enum: Neck, example: Neck.V_NECK })
  @IsOptional()
  @IsEnum(Neck)
  neck?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/...' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Chikankari',
    description:
      '**ARRAY** — comma-separated. Allowed: ' +
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
      '**ARRAY** — comma-separated. Allowed: ' +
      Object.values(PatternPrintType).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(PatternPrintType, { each: true })
  patternPrintType?: string[];

  @ApiPropertyOptional({ enum: SleeveStyle, example: SleeveStyle.BELL })
  @IsOptional()
  @IsEnum(SleeveStyle)
  sleeveStyle?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Neckline,Yoke',
    description:
      '**ARRAY** — comma-separated. Allowed: ' +
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
      '**ARRAY** — comma-separated. Allowed: ' +
      Object.values(SurfaceStyling).join(' | '),
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsEnum(SurfaceStyling, { each: true })
  surfaceStyling?: string[];

  @ApiPropertyOptional({ example: 'true', type: 'string' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  dupattalIncluded?: boolean;

  @ApiPropertyOptional({ example: '3' })
  @IsOptional()
  @IsString()
  netQuantity?: string;

  @ApiPropertyOptional({ example: 'false', type: 'string' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  coOrdSet?: boolean;

  @ApiPropertyOptional({ example: '8901234567890' })
  @IsOptional()
  @IsString()
  ean?: string;

  @ApiPropertyOptional({ example: 'EAN' })
  @IsOptional()
  @IsString()
  eanMeasuringUnit?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Ready to wear,Inner lining included',
    description: '**ARRAY** — free text. Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  otherDetails?: string[];

  @ApiPropertyOptional({ example: 'Elegant Anarkali...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'anarkali kurta,ethnic set',
    description: '**ARRAY** — comma-separated. Max 5.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  searchKeywords?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Pure cotton,Includes dupatta',
    description: '**ARRAY** — key features. Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  keyFeatures?: string[];

  @ApiPropertyOptional({ enum: TopLength, example: TopLength.CALF_LENGTH })
  @IsOptional()
  @IsEnum(TopLength)
  topLength?: string;

  @ApiPropertyOptional({ example: 'Regular Fit' })
  @IsOptional()
  @IsString()
  fit?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Flared silhouette,Side slits',
    description: '**ARRAY** — free text. Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  style?: string[];

  @ApiPropertyOptional({ example: 'true', type: 'string' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  lining?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    example: 'Elastic,Drawstring',
    description: '**ARRAY** — free text. Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  waistband?: string[];

  @ApiPropertyOptional({
    type: 'string',
    example: 'Thread embroidery on yoke',
    description: '**ARRAY** — design notes (free text). Comma-separated.',
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  design?: string[];
}
