import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthService } from './customer-auth.service';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { successResponse } from '../common/response';

@ApiTags('Customer - Auth')
@Controller('customer/auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new customer' })
  async register(@Body() dto: CreateCustomerDto) {
    const result = await this.customerAuthService.register(dto);
    return successResponse(result, { message: 'Registration successful' });
  }

  @Post('login')
  @ApiOperation({ summary: 'Customer login with mobile & password' })
  async login(@Body() dto: LoginCustomerDto) {
    const result = await this.customerAuthService.login(dto);
    return successResponse(result, { message: 'Login successful' });
  }
}