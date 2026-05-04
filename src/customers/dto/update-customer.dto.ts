import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'virat kohli' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'virat@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Mobile number must be a valid 10-digit number' })
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}