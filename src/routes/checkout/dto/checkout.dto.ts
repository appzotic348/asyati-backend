import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsMongoId, IsNotEmpty,
  IsOptional, IsString, Matches, ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Inline address shape ───────────────────────────────────────────────────

export class InlineAddressDto {
  @ApiProperty({ example: 'Virat' })
  @IsString() @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Kohli' })
  @IsString() @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '42, MG Road, Koramangala' })
  @IsString() @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString() @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString() @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '560034' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit number' })
  pincode: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional() @IsString()
  country?: string;
}

// ── Main checkout DTO ──────────────────────────────────────────────────────

export class CheckoutDto {
  // ── Shipping — provide EITHER addressId OR inline address ─────────────────

  @ApiPropertyOptional({
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'ObjectId of a saved customer address to use as shipping address.',
  })
  @IsOptional()
  @IsMongoId()
  shippingAddressId?: string;

  @ApiPropertyOptional({
    type: InlineAddressDto,
    description: 'Inline shipping address. Used when not picking a saved address.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InlineAddressDto)
  shippingAddress?: InlineAddressDto;

  // ── Billing — provide EITHER addressId OR inline address ──────────────────

  @ApiPropertyOptional({
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'ObjectId of a saved customer address to use as billing address.',
  })
  @IsOptional()
  @IsMongoId()
  billingAddressId?: string;

  @ApiPropertyOptional({
    type: InlineAddressDto,
    description: 'Inline billing address. Used when not picking a saved address.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InlineAddressDto)
  billingAddress?: InlineAddressDto;

  // ── Contact ───────────────────────────────────────────────────────────────

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'mobile must be a valid 10-digit Indian number' })
  mobile: string;

  @ApiPropertyOptional({ example: 'virat@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  // ── Payment ───────────────────────────────────────────────────────────────

  @ApiProperty({
    enum: ['Cash', 'Online'],
    example: 'Cash',
    description: '`Cash` = Cash on Delivery.  `Online` = payment gateway.',
  })
  @IsEnum(['Cash', 'Online'], { message: 'paymentMethod must be Cash or Online' })
  paymentMethod: 'Cash' | 'Online';
}