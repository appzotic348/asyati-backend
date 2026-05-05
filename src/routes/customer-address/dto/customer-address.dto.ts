import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsNotEmpty, IsOptional,
  IsString, Matches,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Virat' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Kohli' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '42, MG Road, Koramangala' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '560034' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit number' })
  pincode: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set true to mark this as the default address.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Virat' })
  @IsOptional() @IsString() @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kohli' })
  @IsOptional() @IsString() @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ example: '42, MG Road, Koramangala' })
  @IsOptional() @IsString() @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional() @IsString() @IsNotEmpty()
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional() @IsString() @IsNotEmpty()
  state?: string;

  @ApiPropertyOptional({ example: '560034' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit number' })
  pincode?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional() @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}