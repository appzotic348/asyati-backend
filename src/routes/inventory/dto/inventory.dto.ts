import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt, IsMongoId, IsNotEmpty, IsOptional,
  IsString, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/pagination';

export class UpdateVariantStockDto {
  @ApiProperty({ example: 50, description: 'New stock quantity (absolute value)' })
  @IsInt() @Min(0)
  stock: number;
}

export class InventoryFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'LIBAS-ANK-001', description: 'Search by SKU or product name' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'true',
    type: 'string',
    description: 'true = show only variants with stock < 10',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  lowStock?: boolean;

  @ApiPropertyOptional({ example: '665f1a2b3c4d5e6f7a8b9c0d', description: 'Filter by productId' })
  @IsOptional() @IsMongoId()
  productId?: string;
}