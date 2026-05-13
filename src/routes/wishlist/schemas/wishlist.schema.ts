import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WishlistDocument = Wishlist & Document;

export class WishlistItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true, trim: true })
  sellerSkuId: string;

  @Prop({ trim: true })
  styleCode: string;

  @Prop({ required: true })
  mrp: number;

  @Prop({ required: true })
  sellingPrice: number;

  @Prop({ required: true })
  discount: number;

  @Prop({ required: true })
  discountPct: number;

  @Prop({ type: [String], default: [] })
  availableColors: string[];

  @Prop({ type: [String], default: [] })
  availableSizes: string[];

  @Prop({ trim: true })
  mainImageUrl: string;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: () => new Date() })
  addedAt: Date;
}

@Schema({ timestamps: true })
export class Wishlist {
  @Prop({ type: Types.ObjectId, ref: 'Customer', default: null })
  customerId: Types.ObjectId | null;

  @Prop({ trim: true, default: null })
  guestId: string | null;

  @Prop({ type: [Object], default: [] })
  items: WishlistItem[];

  @Prop({ default: 0 })
  itemCount: number;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

WishlistSchema.index({ customerId: 1 }, { sparse: true });
WishlistSchema.index({ guestId: 1 },    { sparse: true });
WishlistSchema.index({ expiresAt: 1 },  { expireAfterSeconds: 0 });