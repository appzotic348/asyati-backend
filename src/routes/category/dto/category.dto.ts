import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination';

export class CreateCategoryDto {
  @ApiProperty({ example: '665f1a2b3c4d5e6f7a8b9c0d', description: 'Department ID' })
  @IsMongoId()
  departmentId: string;

  @ApiProperty({ example: 'Ethnic Wear' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Traditional ethnic clothing' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional() @IsString()
  icon?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Ethnic Wear' })
  @IsOptional() @IsString() @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class CategoryFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsOptional() @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'Ethnic' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}