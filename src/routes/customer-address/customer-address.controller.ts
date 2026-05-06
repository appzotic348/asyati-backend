import {
  Body, Controller, Delete, Get,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { CustomerAddressService } from './customer-address.service';
import {
  AddressFilterDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/customer-address.dto';
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

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  @ApiResponse({ status: 201, description: 'Address created.' })
  @ApiResponse({ status: 400, description: 'Max 5 addresses or invalid pincode.' })
  async create(
    @GetUser() customer: CustomerDocument,
    @Body() dto: CreateAddressDto,
  ) {
    const address = await this.addressService.create(
      (customer as any)._id.toString(), dto,
    );
    return successResponse(address, { message: 'Address created successfully' });
  }

  // ── GET ALL ───────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get all saved addresses',
    description:
      'Returns all active addresses for the customer.\n\n' +
      '**Filters:** `city`, `state`, `pincode`, `country`\n\n' +
      '**Pagination:** `page` + `limit`. Omit both to get all.',
  })
  @ApiResponse({ status: 200, description: 'Address list.' })
  async findAll(
    @GetUser() customer: CustomerDocument,
    @Query() filters: AddressFilterDto,
  ) {
    const result = await this.addressService.findAll(
      (customer as any)._id.toString(),
      { page: filters.page, limit: filters.limit },
      filters,
    );
    return successResponse(result.data, { meta: result.meta as any });
  }

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
      (customer as any)._id.toString(), id,
    );
    return successResponse(address);
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Address updated.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async update(
    @GetUser() customer: CustomerDocument,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.addressService.update(
      (customer as any)._id.toString(), id, dto,
    );
    return successResponse(address, { message: 'Address updated successfully' });
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Set address as default' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Default updated.' })
  async setDefault(
    @GetUser() customer: CustomerDocument,
    @Param('id') id: string,
  ) {
    const address = await this.addressService.setDefault(
      (customer as any)._id.toString(), id,
    );
    return successResponse(address, { message: 'Default address updated' });
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an address',
    description: 'Soft deletes. If default, next address is promoted automatically.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Address deleted.' })
  @ApiResponse({ status: 404, description: 'Address not found.' })
  async remove(
    @GetUser() customer: CustomerDocument,
    @Param('id') id: string,
  ) {
    await this.addressService.remove((customer as any)._id.toString(), id);
    return successResponse(null, { message: 'Address deleted successfully' });
  }
}