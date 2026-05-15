import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export enum ReviewStatus {
  PENDING  = 'Pending',   
  APPROVED = 'Approved',  
  REJECTED = 'Rejected',  
}

export class ReviewImage {
  url:      string;
  publicId: string;
}

@Schema({ timestamps: true })
export class Review {

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  variantId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ trim: true })
  customerName: string;

  @Prop({ type: Boolean, default: false })
  isVerifiedPurchase: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  orderId: Types.ObjectId | null;

  @Prop({ type: Number, min: 1, max: 5, required: true })
  rating: number;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  body?: string;

  @Prop({
    type: [{ url: String, publicId: String }],
    _id: false,
    default: [],
  })
  images: ReviewImage[];

  @Prop({ type: Number, default: 0 })
  helpfulCount: number;

  @Prop({ type: Number, default: 0 })
  notHelpfulCount: number;

  @Prop({
    type: String,
    enum: Object.values(ReviewStatus),
    default: ReviewStatus.PENDING,
    index: true,
  })
  status: string;

  @Prop({ trim: true, default: null })
  moderationNote: string | null;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ productId: 1, status: 1 });
ReviewSchema.index({ customerId: 1, productId: 1 }, { unique: true }); 
ReviewSchema.index({ productId: 1, rating: 1 });
ReviewSchema.index({ createdAt: -1 });