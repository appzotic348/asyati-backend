import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { LoginAdminDto } from './dto/login-admin.dto';
import { successResponse } from '../common/response';

@ApiTags('Admin - Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin / User login' })
  async login(@Body() dto: LoginAdminDto) {
    const result = await this.adminAuthService.login(dto);
    return successResponse(result, { message: 'Login successful' });
  }
}