import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromotionDocument = Promotion & Document;

export enum PromotionType {
  BANNER = 'Banner',  
  POPUP  = 'Popup',  
  STRIP  = 'Strip',   
}

export enum PromotionPlacement {
  HOME_HERO       = 'HomeHero',      
  HOME_MID        = 'HomeMid',      
  CATEGORY_TOP    = 'CategoryTop', 
  PRODUCT_TOP     = 'ProductTop',   
  CART_SIDEBAR    = 'CartSidebar',  
  CHECKOUT_TOP    = 'CheckoutTop',  
  ANNOUNCEMENT    = 'Announcement',  
  POPUP_GLOBAL    = 'PopupGlobal',  
  POPUP_HOME      = 'PopupHome',    
  POPUP_EXIT      = 'PopupExit',    
}

export enum PromotionStatus {
  ACTIVE   = 'Active',
  INACTIVE = 'Inactive',
  SCHEDULED= 'Scheduled',
  EXPIRED  = 'Expired',
}

export enum PromotionTarget {
  ALL        = 'All',
  GUEST      = 'Guest',       
  LOGGED_IN  = 'LoggedIn',    
  FIRST_TIME = 'FirstTime', 
}

@Schema({ timestamps: true })
export class Promotion {

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  internalNote?: string;

  @Prop({
    type: String,
    enum: Object.values(PromotionType),
    required: true,
  })
  type: string;

  @Prop({
    type: String,
    enum: Object.values(PromotionPlacement),
    required: true,
  })
  placement: string;

  @Prop({ trim: true })
  imageUrl?: string;       

  @Prop({ trim: true })
  mobileImageUrl?: string; 

  @Prop({ trim: true })
  imagePublicId?: string; 

  @Prop({ trim: true })
  content?: string;

  @Prop({ trim: true })
  headline?: string;

  @Prop({ trim: true })
  subHeadline?: string;

  @Prop({ trim: true })
  buttonText?: string;

  @Prop({ trim: true })
  linkUrl?: string;

  @Prop({ type: Boolean, default: false })
  openInNewTab: boolean;

  @Prop({ trim: true, default: null })
  couponCode: string | null;

  @Prop({ type: Date, default: null })
  startDate: Date | null;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({
    type: String,
    enum: Object.values(PromotionTarget),
    default: PromotionTarget.ALL,
  })
  target: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  targetCategories: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Department' }], default: [] })
  targetDepartments: Types.ObjectId[];

  @Prop({ type: Number, min: 0, default: 0 })
  popupDelay: number;

  @Prop({ type: Number, min: 0, default: 1 })
  popupFrequency: number;

  @Prop({ type: Number, min: 0, default: 7 })
  popupCooldownDays: number;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({
    type: String,
    enum: Object.values(PromotionStatus),
    default: PromotionStatus.ACTIVE,
  })
  status: string;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

PromotionSchema.index({ type: 1, placement: 1 });
PromotionSchema.index({ status: 1 });
PromotionSchema.index({ startDate: 1, endDate: 1 });
PromotionSchema.index({ sortOrder: 1 });