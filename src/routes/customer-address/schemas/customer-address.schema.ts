import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerAddressDocument = CustomerAddress & Document;

@Schema({ timestamps: true })
export class CustomerAddress {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  state: string;

  @Prop({ required: true, trim: true })
  pincode: string;

  @Prop({ required: true, trim: true, default: 'India' })
  country: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const CustomerAddressSchema =
  SchemaFactory.createForClass(CustomerAddress);