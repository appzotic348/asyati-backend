import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryDocument = Inventory & Document;

@Schema({ timestamps: true })
export class Inventory {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  variantId: Types.ObjectId;

  @Prop({ required: true, trim: true }) 
  productName: string;

  @Prop({ required: true, trim: true }) 
  sellerSkuId: string;

  @Prop({ trim: true }) 
  variantSku?: string;

  @Prop({ required: true, trim: true }) 
  size: string;

  @Prop({ required: true, trim: true }) 
  color: string;

  @Prop({ trim: true }) 
  variantTitle?: string;

  @Prop({ required: true, min: 0, default: 0 }) 
  stock: number;

  @Prop({ min: 0, default: 0 }) 
  reserved: number;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
InventorySchema.index({ productId: 1, variantId: 1 }, { unique: true });
InventorySchema.index({ sellerSkuId: 1 });
InventorySchema.index({ stock: 1 });
