import {
  Body, Controller, Get, Param, Patch, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrderFilterDto, AdminPaymentFilterDto } from './dto/admin-orders-filter.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { OrderStatus } from '../checkout/schemas/order.schema';
import { successResponse } from '../../common/response';

class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.SHIPPED,
    description:
      'New status. Allowed: Pending | Confirmed | Processing | Shipped | Delivered | Cancelled',
  })
  @IsEnum(OrderStatus)
  orderStatus: OrderStatus;
}

@ApiTags('Admin - Orders & Payments')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get('orders')
  @ApiOperation({
    summary: 'Get all orders with filters and pagination',
    description:
      '**Any authenticated admin user.**\n\n' +
      '**Filters:**\n' +
      '- `orderStatus` — Pending | Confirmed | Processing | Shipped | Delivered | Cancelled\n' +
      '- `paymentStatus` — Pending | Paid | Failed | Refunded\n' +
      '- `paymentMethod` — Cash | Online\n' +
      '- `orderNumber` — exact match e.g. `ORD-20260505-00007`\n' +
      '- `mobile` — 10-digit customer mobile\n' +
      '- `customerId` — MongoDB ObjectId\n' +
      '- `dateFrom` + `dateTo` — ISO 8601 date range e.g. `2026-05-01`\n\n' +
      '**Sort:** `sortBy` (orderTotal | createdAt | orderStatus) + `sortOrder` (asc | desc). Default: newest first.\n\n' +
      '**Pagination:** `page` + `limit`. Omit both to return all records (same behaviour as `getPaymentHistory`).',
  })
  @ApiResponse({ status: 200, description: 'Paginated order list.' })
  async findAllOrders(@Query() filters: AdminOrderFilterDto) {
    const result = await this.adminOrdersService.findAllOrders(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Get('orders/stats')
  @ApiOperation({
    summary: 'Get order statistics and revenue summary',
    description:
      'Returns:\n' +
      '- `ordersByStatus` — count of orders per status\n' +
      '- `paymentBreakdown` — count + total grouped by payment method + payment status\n' +
      '- `revenueToday` — total ₹ and count of paid orders created today\n' +
      '- `revenueAllTime` — total ₹ and count of all paid orders\n' +
      '- `totalOrders` — total count of all orders',
  })
  @ApiResponse({ status: 200, description: 'Order statistics.' })
  async orderStats() {
    const stats = await this.adminOrdersService.getOrderStats();
    return successResponse(stats);
  }

  @Get('orders/:id')
  @ApiOperation({
    summary: 'Get a single order by ID',
    description: 'Returns full order detail with customer name, mobile, email populated.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Order found.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async findOrder(@Param('id') id: string) {
    const order = await this.adminOrdersService.findOrderById(id);
    return successResponse(order);
  }

  @Patch('orders/:id/status')
  @ApiOperation({
    summary: 'Update order status',
    description:
      '**Any authenticated admin user.**\n\n' +
      'Use this to move an order through its fulfilment lifecycle:\n' +
      '`Pending` → `Confirmed` → `Processing` → `Shipped` → `Delivered`\n\n' +
      ' Do **not** use this to change `paymentStatus` — that is managed automatically by the Cashfree webhook.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({ status: 200, description: 'Order status updated.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    const order = await this.adminOrdersService.updateOrderStatus(
      id,
      body.orderStatus,
    );
    return successResponse(order, {
      message: `Order status updated to ${body.orderStatus}`,
    });
  }

  @Get('payments')
  @ApiOperation({
    summary: 'Get all payment records with filters and pagination',
    description:
      '**Any authenticated admin user.**\n\n' +
      '**Filters:**\n' +
      '- `status` — CREATED | ACTIVE | PAID | EXPIRED | FAILED | CANCELLED | PENDING | REFUNDED\n' +
      '- `orderNumber` — exact match\n' +
      '- `customerId` — MongoDB ObjectId\n' +
      '- `dateFrom` + `dateTo` — ISO 8601 date range\n\n' +
      '**Sort:** `sortBy` (amount | createdAt | status) + `sortOrder` (asc | desc). Default: newest first.\n\n' +
      '**Pagination:** `page` + `limit`. Omit both to return all records.',
  })
  @ApiResponse({ status: 200, description: 'Paginated payment list.' })
  async findAllPayments(@Query() filters: AdminPaymentFilterDto) {
    const result = await this.adminOrdersService.findAllPayments(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Get('payments/stats')
  @ApiOperation({
    summary: 'Get payment gateway statistics',
    description:
      'Returns:\n' +
      '- `byStatus` — count + ₹ total per Cashfree gateway status\n' +
      '- `volumeToday` — total ₹ and count of PAID payments created today\n' +
      '- `volumeAllTime` — total ₹ and count of all PAID payments\n' +
      '- `totalPayments` — total count of all payment records',
  })
  @ApiResponse({ status: 200, description: 'Payment statistics.' })
  async paymentStats() {
    const stats = await this.adminOrdersService.getPaymentStats();
    return successResponse(stats);
  }

  @Get('payments/order/:orderId')
  @ApiOperation({
    summary: 'Get payment record for a specific order',
    description:
      'Returns the full payment document with:\n' +
      '- `customerId` populated (name, mobile, email)\n' +
      '- `orderId` populated (orderNumber, orderTotal, orderStatus, paymentStatus)\n' +
      '- Full Cashfree webhook payload (for debugging)',
  })
  @ApiParam({ name: 'orderId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Payment record found.' })
  @ApiResponse({ status: 404, description: 'Payment not found for this order.' })
  async findPaymentByOrder(@Param('orderId') orderId: string) {
    const payment = await this.adminOrdersService.findPaymentByOrderId(orderId);
    return successResponse(payment);
  }
}