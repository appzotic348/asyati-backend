import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/pagination';

// ── Add to wishlist — logged-in customer (no guestId) ────────────────────────

export class AddToWishlistDto {
  @ApiProperty({
    example:     '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'MongoDB ObjectId of the product to wishlist.',
  })
  @IsMongoId()
  productId: string;
}

// ── Add to wishlist — guest (includes guestId) ────────────────────────────────

export class GuestAddToWishlistDto {
  @ApiProperty({
    example:     '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'MongoDB ObjectId of the product to wishlist.',
  })
  @IsMongoId()
  productId: string;

  @ApiProperty({
    example:     'guest_a1b2c3d4e5f6',
    description: 'UUID stored in browser localStorage.',
  })
  @IsString()
  guestId: string;
}

// ── Wishlist pagination — logged-in (no guestId) ──────────────────────────────

export class WishlistFilterDto extends PaginationDto {}


export class GuestWishlistFilterDto {
  @ApiPropertyOptional({ example: 1,  description: 'Page number. Default: 1.' })
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page. Omit to return all.' })
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined)
  @IsInt()
  @Min(1)
  limit?: number;
}

// ── Merge guest wishlist after login ──────────────────────────────────────────

export class MergeWishlistDto {
  @ApiProperty({
    example:     'guest_a1b2c3d4e5f6',
    description:
      'The guestId from localStorage.\n\n' +
      '**Merge flow:**\n' +
      '1. Guest adds products to wishlist\n' +
      '2. Guest logs in / registers\n' +
      '3. Frontend calls `POST /customer/wishlist/merge` with Bearer token + `{ guestId }`\n' +
      '4. Guest wishlist items move into the customer wishlist (duplicates skipped)\n' +
      '5. Guest wishlist is deleted → frontend removes guestId from localStorage',
  })
  @IsString()
  guestId: string;
}