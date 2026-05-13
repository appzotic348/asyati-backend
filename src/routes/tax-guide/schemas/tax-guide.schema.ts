import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaxGuideDocument = TaxGuide & Document;

@Schema({ timestamps: true })
export class TaxGuide {
  @Prop({ required: true, trim: true})
  name: string;         

  @Prop({ required: true, min: 0, max: 100 })
  taxRate: number;       

  @Prop({ trim: true })
  description?: string; 

  @Prop({ trim: true })
  hsnCode?: string;      

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const TaxGuideSchema = SchemaFactory.createForClass(TaxGuide);
TaxGuideSchema.index({ name: 1 });