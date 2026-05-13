import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/pagination';

export class CreateBrandDto {
  @ApiProperty({ example: 'Van Heusen' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Premium formal wear brand' })
  @IsOptional() @IsString()
  description?: string;

//   @ApiPropertyOptional({ example: 'https://vanheusen.com' })
//   @IsOptional() @IsString()
//   website?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  logo?: any;
}

export class UpdateBrandDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

//   @ApiPropertyOptional() @IsOptional() @IsString()
//   website?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  logo?: any;
}

export class BrandFilterDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;
}