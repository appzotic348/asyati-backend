import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerJwtGuard } from '../customer-auth/guards/customer-jwt.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { CustomerDocument } from './schemas/customer.schema';
import { successResponse } from '../common/response';

@ApiTags('Customers')
@ApiBearerAuth('customer-access-token')
@UseGuards(CustomerJwtGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current customer profile' })
  async getProfile(@GetUser() customer: CustomerDocument) {
    const profile = await this.customersService.findById(
      (customer as any)._id.toString(),
    );
    return successResponse(profile);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update customer profile' })
  async updateProfile(
    @GetUser() customer: CustomerDocument,
    @Body() dto: UpdateCustomerDto,
  ) {
    const updated = await this.customersService.updateProfile(
      (customer as any)._id.toString(),
      dto,
    );
    return successResponse(updated, { message: 'Profile updated successfully' });
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete customer account (soft delete)' })
  async deleteAccount(@GetUser() customer: CustomerDocument) {
    await this.customersService.softDelete((customer as any)._id.toString());
    return successResponse(null, { message: 'Account deleted successfully' });
  }
}