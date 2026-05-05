import {
  Body, Controller, Delete, Get,
  Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { CustomerAddressService } from './customer-address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/customer-address.dto';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse } from '../../common/response';

@ApiTags('Customer - Addresses')
@ApiBearerAuth('customer-access-token')
@UseGuards(CustomerJwtGuard)
@Controller('customer/addresses')
export class CustomerAddressController {
  constructor(private readonly addressService: CustomerAddressService) {}

  // ── CREATE ────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create a new address',
    description:
      'Saves a new delivery address for the logged-in customer.\n\n' +
      'Max **5 addresses** per customer.\n\n' +
      'The very first address is automatically set as default.\n\n' +
      'Send `"isDefault": true` to override any existing default.',
  })
  @ApiResponse({ status: 201, description: 'Address created.' })
  @ApiResponse({ status: 400, description: 'Max 5 addresses reached or invalid pincode.' })
  async create(
    @GetUser() customer: CustomerDocument,
    @Body() dto: CreateAddressDto,
  ) {
    const address = await this.addressService.create(
      (customer as any)._id.toString(),
      dto,
    );
    return successResponse(address, { message: 'Address created successfully' });
  }

  // ── GET ALL ───────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get all saved addresses',
    description:
      'Returns all active addresses for the customer.\n\n' +
      'Default address is always first in the list.',
  })
  @ApiResponse({ status: 200, description: 'Address list.' })
  async findAll(@GetUser() customer: CustomerDocument) {
    const addresses = await this.addressService.findAll(
      (customer as any)._id.toString(),
    );
    return successResponse(addresses);
  }

  // ── GET ONE ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single address by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Address found.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async findOne(
    @GetUser() customer: CustomerDocument,
    @Param('id') id: string,
  ) {
    const address = await this.addressService.findOne(
      (customer as any)._id.toString(),
      id,
    );
    return successResponse(address);
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an address',
    description:
      'All fields are optional.\n\n' +
      'Send `"isDefault": true` to make this the default address.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Address updated.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async update(
    @GetUser() customer: CustomerDocument,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.addressService.update(
      (customer as any)._id.toString(),
      id,
      dto,
    );
    return successResponse(address, { message: 'Address updated successfully' });
  }

  // ── SET DEFAULT ───────────────────────────────────────────────────────────

  @Patch(':id/set-default')
  @ApiOperation({
    summary: 'Set address as default',
    description: 'Marks this address as default and unsets all others.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Default address updated.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async setDefault(
    @GetUser() customer: CustomerDocument,
    @Param('id') id: string,
  ) {
    const address = await this.addressService.setDefault(
      (customer as any)._id.toString(),
      id,
    );
    return successResponse(address, { message: 'Default address updated' });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an address',
    description:
      'Soft deletes the address.\n\n' +
      'If the deleted address was the default, the most recently created ' +
      'remaining address is automatically promoted to default.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Address deleted.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async remove(
    @GetUser() customer: CustomerDocument,
    @Param('id') id: string,
  ) {
    await this.addressService.remove(
      (customer as any)._id.toString(),
      id,
    );
    return successResponse(null, { message: 'Address deleted successfully' });
  }
}