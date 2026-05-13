import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../../common/pagination';

const toNum = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? Number(value) : undefined;

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === true;

export class FilterProductsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional() @IsOptional() @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['Active', 'Inactive'] })
  @IsOptional() @IsString()
  listingStatus?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'true = featured products only' })
  @IsOptional() @Transform(toBool) @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'true = published products only' })
  @IsOptional() @Transform(toBool) @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'true = draft products only' })
  @IsOptional() @Transform(toBool) @IsBoolean()
  isDraft?: boolean;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  mrpMin?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  mrpMax?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  sellingPriceMin?: number;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  sellingPriceMax?: number;

  @ApiPropertyOptional({
    description: 'Search across name, brand, sellerSkuId, styleCode, description, searchKeywords',
  })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['mrp', 'sellingPrice', 'stock', 'createdAt', 'brand', 'name'] })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional() @IsString()
  sortOrder?: 'asc' | 'desc';
}
