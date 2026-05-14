import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShipmentDocument = Shipment & Document;

export enum ShipmentStatus {
  PENDING          = 'Pending',
  CREATED          = 'Created',
  PICKUP_SCHEDULED = 'PickupScheduled',
  PICKED_UP        = 'PickedUp',
  IN_TRANSIT       = 'InTransit',
  OUT_FOR_DELIVERY = 'OutForDelivery',
  DELIVERED        = 'Delivered',
  DELIVERY_FAILED  = 'DeliveryFailed',
  RTO_INITIATED    = 'RTOInitiated',
  RTO_DELIVERED    = 'RTODelivered',
  CANCELLED        = 'Cancelled',
}

export class TrackingEvent {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true, trim: true })
  status: string;

  @Prop({ trim: true })
  location?: string;

  @Prop({ trim: true })
  description?: string;
}

@Schema({ timestamps: true })
export class Shipment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, unique: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  orderNumber: string;

  @Prop({ trim: true, default: null })
  awbNumber: string | null;

  @Prop({ trim: true, default: null })
  ekartShipmentId: string | null;

  @Prop({ trim: true, default: null })
  trackingUrl: string | null;

  @Prop({ trim: true, default: null })
  labelUrl: string | null;

  @Prop({
    type: String,
    enum: Object.values(ShipmentStatus),
    default: ShipmentStatus.PENDING,
  })
  status: string;

  @Prop({ required: true, trim: true })
  paymentType: string;

  @Prop({ required: true, default: 0 })
  codAmount: number;

  @Prop({
    type: {
      firstName: String, lastName: String, address: String,
      city: String, state: String, pincode: String, country: String,
    },
    _id: false,
  })
  deliveryAddress: {
    firstName: string; lastName: string; address: string;
    city: string; state: string; pincode: string; country: string;
  };

  @Prop({ required: true, trim: true })
  mobile: string;

  @Prop({ trim: true, default: null })
  email: string | null;

  @Prop({ type: Number, default: 0.5 })
  weightKg: number;

  @Prop({ type: Number, default: 1 })
  itemCount: number;

  @Prop({ type: Object, default: null })
  ekartCreateResponse: Record<string, any> | null;

  @Prop({ type: [Object], default: [] })
  trackingEvents: TrackingEvent[];

  @Prop({ type: Date, default: null })
  lastTrackedAt: Date | null;

  @Prop({ trim: true, default: null })
  lastError: string | null;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
ShipmentSchema.index({ orderId: 1 },    { unique: true });
ShipmentSchema.index({ awbNumber: 1 },  { sparse: true });
ShipmentSchema.index({ customerId: 1 });
ShipmentSchema.index({ status: 1 });