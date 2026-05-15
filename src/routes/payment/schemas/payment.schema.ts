import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentGatewayStatus {
  CREATED   = 'CREATED',    
  ACTIVE    = 'ACTIVE',    
  PAID      = 'PAID',     
  EXPIRED   = 'EXPIRED',    
  FAILED    = 'FAILED',    
  CANCELLED = 'CANCELLED', 
  PENDING   = 'PENDING',  
  REFUNDED  = 'REFUNDED',   
}

@Schema({ timestamps: true })
export class Payment {

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  orderNumber: string;

  @Prop({ required: true, unique: true, trim: true })
  cfOrderId: string;

  @Prop({ required: true, trim: true })
  paymentSessionId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, trim: true, default: 'INR' })
  currency: string;

  @Prop({
    type:    String,
    enum:    Object.values(PaymentGatewayStatus),
    default: PaymentGatewayStatus.CREATED,
  })
  status: string;

  @Prop({ trim: true, default: null })
  cfPaymentId: string | null;

  @Prop({ type: Object, default: null })
  webhookPayload: Record<string, any> | null;

  @Prop({ type: Date, default: null })
  webhookReceivedAt: Date | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ cfOrderId: 1 });
PaymentSchema.index({ orderId: 1, customerId: 1 });
PaymentSchema.index({ status: 1 });