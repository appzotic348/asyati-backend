import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BrandDocument = Brand & Document;

@Schema({ timestamps: true })
export class Brand {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: { url: String, publicId: String }, _id: false })
  logo?: { url: string; publicId: string };

//   @Prop({ trim: true })
//   website?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
BrandSchema.index({ name: 1, isDeleted: 1 });