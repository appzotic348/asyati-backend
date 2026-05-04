import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export const SUPER_ADMIN_ROLE = 'superadmin';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true, lowercase: true })
  username: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: String, default: 'admin', trim: true, lowercase: true })
  role: string;

  @Prop({ trim: true, default: null })
  mobileNumber: string | null;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);