import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponDocument = Coupon & Document;

export enum DiscountType {
  PERCENTAGE = 'Percentage',  
  FLAT       = 'Flat',        
  FREE_SHIP  = 'FreeShipping',
}

export enum CouponScope {
  ALL        = 'All',         
  CATEGORY   = 'Category',     
  DEPARTMENT = 'Department',   
  PRODUCT    = 'Product',     
}

export enum CouponStatus {
  ACTIVE   = 'Active',
  INACTIVE = 'Inactive',
  EXPIRED  = 'Expired',
}

@Schema({ timestamps: true })
export class Coupon {

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  code: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(DiscountType),
    required: true,
  })
  discountType: string;

  @Prop({ type: Number, min: 0, default: 0 })
  discountValue: number;

  @Prop({ type: Number, min: 0, default: null })
  maxDiscountAmount: number | null;

  @Prop({
    type: String,
    enum: Object.values(CouponScope),
    default: CouponScope.ALL,
  })
  scope: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  applicableProducts: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  applicableCategories: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Department' }], default: [] })
  applicableDepartments: Types.ObjectId[];

  @Prop({ type: Number, min: 0, default: 0 })
  minOrderValue: number;

  @Prop({ type: Number, min: 0, default: 0 })
  maxOrderValue: number;

  @Prop({ type: Number, min: 0, default: 0 })
  totalUsageLimit: number;

  @Prop({ type: Number, min: 0, default: 1 })
  perCustomerLimit: number;

  @Prop({ type: Number, min: 0, default: 0 })
  usedCount: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({
    type: String,
    enum: Object.values(CouponStatus),
    default: CouponStatus.ACTIVE,
  })
  status: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Boolean, default: false })
  firstTimeOnly: boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ status: 1 });
CouponSchema.index({ startDate: 1, endDate: 1 });
CouponSchema.index({ scope: 1 });