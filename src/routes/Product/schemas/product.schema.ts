import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  IdealFor,
  SleeveLength,
  Pattern,
  Fabric,
  TopType,
  BottomType,
  AdditionalGarments,
  Size,
  Color,
  Occasion,
  TopFabric,
  BottomFabric,
  KurtaStyleType,
  OrnamentationType,
  Neck,
  Trend,
  PatternPrintType,
  SleeveStyle,
  DetailPlacement,
  SurfaceStyling,
  TopLength,
  ListingStatus,
} from '../enums/product.enums';

export type ProductDocument = Product & Document;

export class ProductImage {
  url: string;
  publicId: string;
}

@Schema({ timestamps: true })
export class Product {

  @Prop({ required: true, trim: true, unique: true })
  sellerSkuId: string;

  @Prop({ trim: true })
  groupId?: string;

  @Prop({
    type: String,
    enum: Object.values(ListingStatus),
    default: ListingStatus.INACTIVE,
  })
  listingStatus: string;

  @Prop({ required: true, min: 0 })
  mrp: number;

  @Prop({ required: true, min: 0 })
  sellingPrice: number;

  @Prop({ trim: true, default: 'e-cart' })
  procurementType: string;

  @Prop({ type: Number })
  procurementSla?: number;

  @Prop({ type: Number, min: 0, default: 0 })
  stock: number;

  @Prop({ trim: true })
  shippingProvider?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  localHandlingFee: number;

  @Prop({ type: Number, min: 0, default: 0 })
  zonalHandlingFee: number;

  @Prop({ type: Number, min: 0, default: 0 })
  nationalHandlingFee: number;

  @Prop({ type: Number })
  lengthCm?: number;

  @Prop({ type: Number })
  breadthCm?: number;

  @Prop({ type: Number })
  heightCm?: number;

  @Prop({ type: Number })
  weightKg?: number;

  @Prop({ trim: true })
  hsn?: string;

  @Prop({ type: Number })
  luxuryCess?: number;

  @Prop({ trim: true, default: 'India' })
  countryOfOrigin: string;

  @Prop({ trim: true })
  manufacturerDetails?: string;

  @Prop({ trim: true })
  packerDetails?: string;

  @Prop({ trim: true })
  importerDetails?: string;

  @Prop({ trim: true })
  taxCode?: string;

  @Prop({ type: Number, min: 1, default: 1 })
  minimumOrderQuantity: number;

  @Prop({ required: true, trim: true })
  brand: string;

  @Prop({ type: [String], required: true })
  itemsIncluded: string[];

  @Prop({ required: true, enum: Object.values(IdealFor) })
  idealFor: string;

  @Prop({ required: true, enum: Object.values(SleeveLength) })
  sleeveLength: string;

  @Prop({ type: [String], required: true, enum: Object.values(Pattern) })
  pattern: string[];

  @Prop({ type: [String], required: true, enum: Object.values(Fabric) })
  fabric: string[];

  @Prop({ required: true, enum: Object.values(TopType) })
  topType: string;

  @Prop({ required: true, enum: Object.values(BottomType) })
  bottomType: string;

  @Prop({ enum: Object.values(AdditionalGarments) })
  additionalGarments?: string;

  @Prop({ required: true, enum: Object.values(Size) })
  size: string;

  @Prop({ trim: true, default: 'Regular' })
  sizeMeasuringUnit: string;

  @Prop({ required: true, trim: true })
  styleCode: string;

  @Prop({ type: [String], required: true, enum: Object.values(Color) })
  color: string[];

  @Prop({ type: [String] })
  brandColor: string[];

  @Prop({
    type: { url: String, publicId: String },
    _id: false,
  })
  mainImage?: ProductImage;

  @Prop({
    type: [{ url: String, publicId: String }],
    _id: false,
    default: [],
  })
  otherImages: ProductImage[];

  @Prop({ type: { url: String, publicId: String }, _id: false })
  mainPaletteImage?: ProductImage;

  @Prop({ type: [String], enum: Object.values(Occasion) })
  occasion: string[];

  @Prop({ type: [String], enum: Object.values(TopFabric) })
  topFabric: string[];

  @Prop({ type: [String], enum: Object.values(BottomFabric) })
  bottomFabric: string[];

  @Prop({ enum: Object.values(KurtaStyleType) })
  kurtaStyleType?: string;

  @Prop({ type: [String], enum: Object.values(OrnamentationType) })
  ornamentationType: string[];

  @Prop({ type: [String], enum: Object.values(Color) })
  secondaryColor: string[];

  @Prop({ type: [String] })
  fabricCare: string[];

  @Prop({ type: [String] })
  liningMaterial: string[];

  @Prop({ type: [String] })
  knitType: string[];

  @Prop({ enum: Object.values(Neck) })
  neck?: string;

  @Prop({ trim: true })
  videoUrl?: string;

  @Prop({ type: [String], enum: Object.values(Trend) })
  trend: string[];

  @Prop({ type: [String], enum: Object.values(PatternPrintType) })
  patternPrintType: string[];

  @Prop({ enum: Object.values(SleeveStyle) })
  sleeveStyle?: string;

  @Prop({ type: [String], enum: Object.values(DetailPlacement) })
  detailPlacement: string[];

  @Prop({ type: [String], enum: Object.values(SurfaceStyling) })
  surfaceStyling: string[];

  @Prop({ type: Boolean })
  dupattalIncluded?: boolean;

  @Prop({ trim: true })
  netQuantity?: string;

  @Prop({ type: Boolean })
  coOrdSet?: boolean;

  @Prop({ trim: true })
  ean?: string;

  @Prop({ trim: true })
  eanMeasuringUnit?: string;

  @Prop({ type: [String] })
  otherDetails: string[];

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String] })
  searchKeywords: string[];

  @Prop({ type: [String] })
  keyFeatures: string[];

  @Prop({ enum: Object.values(TopLength) })
  topLength?: string;

  @Prop({ trim: true })
  fit?: string;

  @Prop({ type: [String] })
  style: string[];

  @Prop({ type: Boolean })
  lining?: boolean;

  @Prop({ type: [String] })
  waistband: string[];

  @Prop({ type: [String] })
  design: string[];

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

export {
  IdealFor,
  SleeveLength,
  Pattern,
  Fabric,
  TopType,
  BottomType,
  AdditionalGarments,
  Size,
  Color,
  Occasion,
  TopFabric,
  BottomFabric,
  KurtaStyleType,
  OrnamentationType,
  Neck,
  Trend,
  PatternPrintType,
  SleeveStyle,
  DetailPlacement,
  SurfaceStyling,
  TopLength,
  ListingStatus,
};
