import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt, IsMongoId, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';

const toNum = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? Number(value) : undefined;

const toInt = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined;

export class CustomerProductFilterDto {

  @ApiPropertyOptional({ example: 1, description: 'Page number. Default: 1.' })
  @IsOptional() @Transform(toInt) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page. Omit to return all.' })
  @IsOptional() @Transform(toInt) @IsInt() @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'Filter by department ObjectId.',
  })
  @IsOptional() @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional({
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'Filter by category ObjectId.',
  })
  @IsOptional() @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 500,
    description: 'Minimum selling price in ₹ — matched against variants[].pricing.sellingPrice.',
  })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({
    example: 3000,
    description: 'Maximum selling price in ₹ — matched against variants[].pricing.sellingPrice.',
  })
  @IsOptional() @Transform(toNum) @IsNumber() @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({
    example: 'Libas',
    description: 'Case-insensitive partial match against product name or searchKeywords.',
  })
  @IsOptional() @IsString()
  brand?: string;

  @ApiPropertyOptional({
    example: 'M',
    description: 'Filter by size — matched against variants[].size.',
  })
  @IsOptional() @IsString()
  size?: string;

  @ApiPropertyOptional({
    example: 'Blue',
    description: 'Filter by color — matched against variants[].color.',
  })
  @IsOptional() @IsString()
  color?: string;

  @ApiPropertyOptional({
    example: 'Sleeve Length:Full Sleeve,Occasion:Wedding',
    description:
      'Comma-separated `Key:Value` pairs matched against the metadata[] array. ' +
      'Example: `metadata=Sleeve Length:Full Sleeve,Occasion:Wedding` ' +
      'returns products that have ALL of those metadata entries.',
  })
  @IsOptional() @IsString()
  metadata?: string;

  @ApiPropertyOptional({
    example: 'anarkali',
    description:
      'Case-insensitive full-text search across: name, styleCode, sellerSkuId, ' +
      'description, searchKeywords, keyFeatures.',
  })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: ['sellingPrice', 'mrp', 'createdAt'],
    description: 'Sort field. Default: createdAt.',
  })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'asc',
    enum: ['asc', 'desc'],
    description: 'Sort direction. Default: desc.',
  })
  @IsOptional() @IsString()
  sortOrder?: 'asc' | 'desc';
}