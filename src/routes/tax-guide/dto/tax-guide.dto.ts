import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination';

export class CreateTaxGuideDto {
  @ApiProperty({ example: 'GST 5%' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5, description: 'Tax rate as percentage (0-100)' })
  @IsNumber() @Min(0) @Max(100)
  taxRate: number;

  @ApiPropertyOptional({ example: 'Apparel below ₹1000' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '6211' })
  @IsOptional() @IsString()
  hsnCode?: string;
}

export class UpdateTaxGuideDto {
  @ApiPropertyOptional({ example: 'GST 5%' })
  @IsOptional() @IsString() @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional() @IsNumber() @Min(0) @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  hsnCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class TaxGuideFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'GST' })
  @IsOptional() @IsString()
  search?: string;
}