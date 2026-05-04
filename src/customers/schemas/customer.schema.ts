import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  mobile: string;

  @Prop({ lowercase: true, trim: true, default: null })
  email: string | null;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);