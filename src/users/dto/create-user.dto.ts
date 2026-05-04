import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'virat kohli' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'virat@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: 'manager',
    description:
      'Any role string e.g. admin, manager, editor. "superadmin" is reserved and cannot be assigned via API.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  role?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Invalid mobile number' })
  mobileNumber?: string;
}