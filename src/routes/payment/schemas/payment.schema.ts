// src/payment/schemas/payment.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

/**
 * Maps to Cashfree order_status / payment_status values.
 * Docs: https://www.cashfree.com/docs/api-reference/payments/latest/payments/webhooks
 */
export enum PaymentGatewayStatus {
  CREATED   = 'CREATED',    // Payment session created, customer hasn't paid yet
  ACTIVE    = 'ACTIVE',     // Order is active, payment in progress
  PAID      = 'PAID',       // Payment successful
  EXPIRED   = 'EXPIRED',    // Order expired before payment
  FAILED    = 'FAILED',     // Payment failed
  CANCELLED = 'CANCELLED',  // User dropped / abandoned payment
  PENDING   = 'PENDING',    // Payment pending (processing)
  REFUNDED  = 'REFUNDED',   // Payment refunded
}

@Schema({ timestamps: true })
export class Payment {
  /** Reference to our Order document */
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  /** Reference to our Customer document */
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  /** Our internal order number e.g. ORD-20240512-00042 */
  @Prop({ required: true, trim: true })
  orderNumber: string;

  /**
   * Cashfree's order ID — for version 2025-01-01 this equals our orderNumber
   * because we pass order_id = order.orderNumber when creating the CF order.
   */
  @Prop({ required: true, unique: true, trim: true })
  cfOrderId: string;

  /** Passed to the Cashfree JS SDK on the frontend to open checkout */
  @Prop({ required: true, trim: true })
  paymentSessionId: string;

  /** Order amount in INR */
  @Prop({ required: true })
  amount: number;

  /** Currency — always INR for now */
  @Prop({ required: true, trim: true, default: 'INR' })
  currency: string;

  /** Current status of this payment record */
  @Prop({
    type:    String,
    enum:    Object.values(PaymentGatewayStatus),
    default: PaymentGatewayStatus.CREATED,
  })
  status: string;

  /**
   * Cashfree's individual payment ID (cf_payment_id).
   * Filled after a successful payment via webhook or verify.
   */
  @Prop({ trim: true, default: null })
  cfPaymentId: string | null;

  /**
   * Full raw webhook payload stored for audit trail.
   * Helps debug issues and replay missed updates.
   */
  @Prop({ type: Object, default: null })
  webhookPayload: Record<string, any> | null;

  /** Timestamp of when the last webhook was received */
  @Prop({ type: Date, default: null })
  webhookReceivedAt: Date | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Compound indexes for common query patterns
PaymentSchema.index({ cfOrderId: 1 });
PaymentSchema.index({ orderId: 1, customerId: 1 });
PaymentSchema.index({ status: 1 });