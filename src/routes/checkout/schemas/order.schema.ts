import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export class OrderAddress {
  @Prop({ required: true, trim: true }) firstName: string;
  @Prop({ required: true, trim: true }) lastName:  string;
  @Prop({ required: true, trim: true }) address:   string;
  @Prop({ required: true, trim: true }) city:      string;
  @Prop({ required: true, trim: true }) state:     string;
  @Prop({ required: true, trim: true }) pincode:   string;
  @Prop({ required: true, trim: true }) country:   string;
}

export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  variantId: Types.ObjectId;

  @Prop({ required: true }) quantity:        number;
  @Prop({ required: true }) priceAtOrder:    number;
  @Prop({ required: true }) mrpAtOrder:      number;
  @Prop({ required: true }) discountAtOrder: number;
  @Prop({ required: true }) itemTotal:       number;   

  @Prop({ required: true, default: 0 }) taxRateAtOrder: number;
  
  @Prop({ required: true, default: 0 }) itemTax: number;

  @Prop({ trim: true })     productName:     string;
  @Prop({ trim: true })     sellerSkuId:     string;
  @Prop({ trim: true })     variantSku:      string;
  @Prop({ trim: true })     variantTitle:    string;
  @Prop({ trim: true })     size:            string;
  @Prop({ type: [String] }) color:           string[];
  @Prop({ trim: true })     mainImageUrl:    string;
}

export enum OrderStatus {
  PENDING    = 'Pending',
  CONFIRMED  = 'Confirmed',
  PROCESSING = 'Processing',
  SHIPPED    = 'Shipped',
  DELIVERED  = 'Delivered',
  CANCELLED  = 'Cancelled',
}

export enum PaymentMethod {
  CASH   = 'Cash',
  ONLINE = 'Online',
}

export enum PaymentStatus {
  PENDING  = 'Pending',
  PAID     = 'Paid',
  FAILED   = 'Failed',
  REFUNDED = 'Refunded',
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  orderNumber: string;

  @Prop({ type: [Object], required: true })
  items: OrderItem[];

  @Prop({ type: Object, required: true })
  shippingAddress: OrderAddress;

  @Prop({ type: Object, required: true })
  billingAddress: OrderAddress;

  @Prop({ required: true, trim: true })
  mobile: string;

  @Prop({ trim: true, default: null })
  email: string | null;

  // ── Totals (all snapshotted at time of order) ─────────────────────────────
  @Prop({ required: true }) mrpTotal:        number;
  @Prop({ required: true }) subTotal:        number;
  @Prop({ required: true }) totalDiscount:   number;
  @Prop({ required: true }) discountPercent: number;
  @Prop({ required: true }) shippingCharge:  number;
  @Prop({ required: true }) platformFee:     number;
  @Prop({ required: true }) tax:             number;
  @Prop({ required: true }) orderTotal:      number;

  // ── Status ────────────────────────────────────────────────────────────────
  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  orderStatus: string;

  @Prop({ type: String, enum: Object.values(PaymentMethod), required: true })
  paymentMethod: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  })
  paymentStatus: string;

  @Prop({ trim: true, default: null })
  paymentReference: string | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ customerId: 1, createdAt: -1 });