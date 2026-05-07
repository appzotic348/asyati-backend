import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto, OrderFilterDto } from './dto/checkout.dto';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse } from '../../common/response';

@ApiTags('Customer - Checkout')
@ApiBearerAuth('customer-access-token')
@UseGuards(CustomerJwtGuard)
@Controller('customer/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  // ── PLACE ORDER ───────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Place an order',
    description:
      'Converts the customer cart into an order.\n\n' +
      '**Address rules:**\n' +
      '- For shipping: send either `shippingAddressId` (saved address ObjectId) **or** `shippingAddress` (inline object) — not both.\n' +
      '- For billing:  send either `billingAddressId`  **or** `billingAddress` — not both.\n' +
      '- If an inline address is provided and the customer has fewer than 5 saved addresses, it is automatically saved.\n\n' +
      '**Payment methods:** `Cash` (COD) or `Online` (gateway — you handle payment confirmation separately).\n\n' +
      'Cart is cleared on success.',
  })
  @ApiResponse({ status: 201, description: 'Order placed successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cart empty, address conflict, or validation error.',
  })
  @ApiResponse({ status: 404, description: 'Saved address not found.' })
  async placeOrder(
    @GetUser() customer: CustomerDocument,
    @Body() dto: CheckoutDto,
  ) {
    const order = await this.checkoutService.placeOrder(
      (customer as any)._id.toString(),
      dto,
    );
    return successResponse(order, { message: 'Order placed successfully' });
  }

  // ── GET ALL ORDERS ────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({
    summary: 'Get all orders',
    description:
      '**Filters:** `orderStatus`, `paymentStatus`, `paymentMethod`, `fromDate`, `toDate`\n\n' +
      '**Pagination:** `page` + `limit`. Omit both to get all.',
  })
  @ApiResponse({ status: 200, description: 'Order list.' })
  async findAll(
    @GetUser() customer: CustomerDocument,
    @Query() filters: OrderFilterDto,
  ) {
    const result = await this.checkoutService.findAll(
      (customer as any)._id.toString(),
      { page: filters.page, limit: filters.limit },
      filters,
    );
    return successResponse(result.data, { meta: result.meta as any });
  }

  // ── GET SINGLE ORDER ──────────────────────────────────────────────────────

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Order found.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async findOne(
    @GetUser() customer: CustomerDocument,
    @Param('id') id: string,
  ) {
    const order = await this.checkoutService.findById(
      (customer as any)._id.toString(),
      id,
    );
    return successResponse(order);
  }
}