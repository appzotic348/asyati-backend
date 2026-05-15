import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;

export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  variantId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  priceAtAdd: number;

  @Prop({ required: true })
  mrpAtAdd: number;

  @Prop({ required: true })
  discountAtAdd: number;

  @Prop({ required: true })
  discountPctAtAdd: number;

  @Prop({ trim: true })
  currency: string;

  @Prop({ default: 0 })
  taxRate: number;

  @Prop({ default: 0 })
  itemTax: number;

  @Prop({ trim: true })
  productName: string;

  @Prop({ trim: true })
  sellerSkuId: string;

  @Prop({ trim: true })
  variantSku: string;

  @Prop({ trim: true })
  variantTitle: string;

  @Prop({ trim: true })
  size: string;

  @Prop({ type: [String] })
  color: string[];

  @Prop({ trim: true })
  mainImageUrl: string;

  @Prop({ default: 0 })
  availableStockAtAdd: number;

  @Prop({ default: () => new Date() })
  addedAt: Date;

  @Prop({ required: true })
  itemMrpTotal: number;

  @Prop({ required: true })
  itemSellingTotal: number;

  @Prop({ required: true })
  itemDiscountTotal: number;
}

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'Customer', default: null })
  customerId: Types.ObjectId | null;

  @Prop({ trim: true, default: null })
  guestId: string | null;

  @Prop({ type: [Object], default: [] })
  items: CartItem[];

  @Prop({ default: 0 }) mrpTotal:        number;
  @Prop({ default: 0 }) subTotal:        number;
  @Prop({ default: 0 }) totalDiscount:   number;
  @Prop({ default: 0 }) discountPercent: number;
  @Prop({ default: 0 }) shippingCharge:  number;
  @Prop({ default: 0 }) platformFee:     number;
  @Prop({ default: 0 }) tax:             number;   
  @Prop({ default: 0 }) orderTotal:      number;
  @Prop({ default: 0 }) itemCount:       number;
  @Prop({ default: 0 }) totalQuantity:   number;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.index({ customerId: 1 }, { sparse: true });
CartSchema.index({ guestId: 1 },    { sparse: true });
CartSchema.index({ expiresAt: 1 },  { expireAfterSeconds: 0 });