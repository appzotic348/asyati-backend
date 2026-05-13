import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

export class ProductImage {
  url: string;
  publicId: string;
}

export class OtherImage {
  type: string;
  url: string;
  publicId: string;
}

export class ProductMetadata {
  key: string;
  value: string;
  type: string;
}

export class ShippingDimensions {
  weightKg?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
}

export class VariantPricing {
  mrp: number;
  sellingPrice: number;
  costPrice?: number;
  currency: string;
}

export class VariantInventorySnapshot {
  stock: number;
  reserved: number;
  available: number;
}

export class ProductVariant {
  _id: Types.ObjectId;
  title: string;
  sku: string;
  barcode?: string;
  color: string;
  size: string;
  hsn?: string;
  pricing: VariantPricing;
  inventory: VariantInventorySnapshot;
  shipping: ShippingDimensions;
  status: string;
}

@Schema({ timestamps: true })
export class Product {
  @Prop({
    type: Types.ObjectId,
    ref: 'Department',
    required: true,
    index: true,
  })
  departmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand', default: null, index: true })
  brandId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'TaxGuide', default: null })
  taxGuideId: Types.ObjectId | null;

  @Prop({ required: true, trim: true, unique: true })
  sellerSkuId: string;

  @Prop({ trim: true })
  groupId?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  styleCode?: string;

  @Prop({ type: String, enum: ['Active', 'Inactive'], default: 'Inactive' })
  listingStatus: string;

  @Prop({
    type: {
      isPublished: { type: Boolean, default: false },
      isSearchable: { type: Boolean, default: true },
      isFeatured: { type: Boolean, default: false },
    },
    _id: false,
    default: () => ({
      isPublished: false,
      isSearchable: true,
      isFeatured: false,
    }),
  })
  visibility: {
    isPublished: boolean;
    isSearchable: boolean;
    isFeatured: boolean;
  };

  @Prop({ type: Number, min: 0, default: 0 }) totalStock: number;
  @Prop({ type: Number, min: 0, default: 0 }) totalReserved: number;
  @Prop({ type: Number, min: 0, default: 0 }) availableStock: number;

  @Prop({ type: Number, min: 1, default: 1 }) minimumOrderQuantity: number;

  @Prop({
    type: { country: { type: String, default: 'India' } },
    _id: false,
    default: () => ({ country: 'India' }),
  })
  origin: { country: string };

  @Prop({ type: { url: String, publicId: String }, _id: false })
  mainImage?: ProductImage;

  @Prop({
    type: [{ type: { type: String }, url: String, publicId: String }],
    _id: false,
    default: [],
  })
  otherImages: OtherImage[];

  @Prop({ type: { url: String, publicId: String }, _id: false })
  mainPaletteImage?: ProductImage;

  @Prop({ trim: true }) shortDescription?: string;
  @Prop({ trim: true }) description?: string;
  @Prop({ type: [String], default: [] }) searchKeywords: string[];
  @Prop({ type: [String], default: [] }) keyFeatures: string[];
  @Prop({ trim: true }) videoUrl?: string;

  @Prop({
    type: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: [String],
    },
    _id: false,
    default: () => ({}),
  })
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
  };

  @Prop({
    type: [
      { key: String, value: String, type: { type: String, default: 'TEXT' } },
    ],
    _id: false,
    default: [],
  })
  metadata: ProductMetadata[];

  @Prop({
    type: [
      {
        title: String,
        sku: { type: String, required: true },
        barcode: String,
        color: { type: String, required: true },
        size: { type: String, required: true },
        hsn: String,
        status: {
          type: String,
          enum: ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'],
          default: 'ACTIVE',
        },
        pricing: {
          mrp: { type: Number, required: true, min: 0 },
          sellingPrice: { type: Number, required: true, min: 0 },
          costPrice: { type: Number, min: 0 },
          currency: { type: String, default: 'INR' },
        },
        inventory: {
          stock: { type: Number, min: 0, default: 0 },
          reserved: { type: Number, min: 0, default: 0 },
          available: { type: Number, min: 0, default: 0 },
        },
        shipping: {
          weightKg: { type: Number, min: 0 },
          lengthCm: { type: Number, min: 0 },
          breadthCm: { type: Number, min: 0 },
          heightCm: { type: Number, min: 0 },
        },
      },
    ],
    default: [],
  })
  variants: ProductVariant[];

  @Prop({
    type: {
      isDeleted: { type: Boolean, default: false },
      isBlocked: { type: Boolean, default: false },
      isDraft: { type: Boolean, default: false },
    },
    _id: false,
    default: () => ({ isDeleted: false, isBlocked: false, isDraft: false }),
  })
  flags: { isDeleted: boolean; isBlocked: boolean; isDraft: boolean };
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ sellerSkuId: 1 });
ProductSchema.index({ departmentId: 1, categoryId: 1 });
ProductSchema.index({ 'flags.isDeleted': 1, listingStatus: 1 });
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ 'visibility.isFeatured': 1 });
ProductSchema.index({ 'variants.sku': 1 }, { sparse: true });
