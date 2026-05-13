import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShippingConfigDocument = ShippingConfig & Document;

@Schema({ timestamps: true })
export class ShippingConfig {

  @Prop({ required: true, min: 0, default: 99 })
  shippingCharge: number;

  @Prop({ required: true, min: 0, default: 999 })
  freeShippingAbove: number;

  @Prop({ trim: true, default: null })
  note: string | null;
}

export const ShippingConfigSchema = SchemaFactory.createForClass(ShippingConfig);