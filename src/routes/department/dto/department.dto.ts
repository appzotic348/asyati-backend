import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Clothing' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'All clothing items' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional() @IsString()
  icon?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Clothing' })
  @IsOptional() @IsString() @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'All clothing items' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://...' })
  @IsOptional() @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class DepartmentFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'Clothing' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}