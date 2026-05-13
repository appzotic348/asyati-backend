import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';

// ── Add item ──────────────────────────────────────────────────────────────────
export class AddToCartDto {
  @ApiProperty({
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'MongoDB ObjectId of the product.',
  })
  @IsMongoId()
  productId: string;

  @ApiProperty({
    example: '775f1a2b3c4d5e6f7a8b9c0e',
    description:
      'MongoDB ObjectId of the specific variant (_id inside product.variants[]).\n\n' +
      'Each variant has its own size, color, pricing and stock — this field is required.',
  })
  @IsMongoId()
  variantId: string;

  @ApiProperty({ example: 1, description: 'Quantity to add. Minimum: 1.' })
  @Transform(({ value }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 'guest_a1b2c3d4e5f6',
    description:
      '**Guest only.** UUID string from browser localStorage.\n' +
      'Omit when the user is logged in — use Bearer token instead.',
  })
  @IsOptional()
  @IsString()
  guestId?: string;
}

// ── Update item quantity ──────────────────────────────────────────────────────
export class UpdateCartItemDto {
  @ApiProperty({
    example: 3,
    description: 'New absolute quantity. Send 0 to remove the item entirely.',
  })
  @Transform(({ value }) => parseInt(String(value), 10))
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    example: 'guest_a1b2c3d4e5f6',
    description: 'Guest cart ID. Omit when logged in.',
  })
  @IsOptional()
  @IsString()
  guestId?: string;
}

// ── Merge guest cart after login ──────────────────────────────────────────────
export class MergeCartDto {
  @ApiProperty({
    example: 'guest_a1b2c3d4e5f6',
    description:
      'The guestId from localStorage.\n\n' +
      '**Full merge flow:**\n' +
      '1. Guest adds items → guestId cart created\n' +
      '2. Guest proceeds to checkout → redirected to login/register\n' +
      '3. Guest logs in/registers → receives accessToken\n' +
      '4. Frontend calls `POST /customer/cart/merge` with Bearer token + `{ guestId }`\n' +
      '5. Guest items are moved into the customer cart (quantities combined)\n' +
      '6. Guest cart is deleted → frontend removes guestId from localStorage',
  })
  @IsString()
  guestId: string;
}