import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginAdminDto {
  @ApiProperty({ example: 'superadmin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SuperAdmin@123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}