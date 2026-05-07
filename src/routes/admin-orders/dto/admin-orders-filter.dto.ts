import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../checkout/schemas/order.schema';
import { PaymentGatewayStatus } from '../../payment/schemas/payment.schema';
import { PaginationDto } from '../../../common/pagination';

// ── Orders filter ─────────────────────────────────────────────────────────────
export class AdminOrderFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: OrderStatus, example: OrderStatus.PENDING,
    description: 'Filter by order status.',
  })
  @IsOptional() @IsEnum(OrderStatus)
  orderStatus?: string;

  @ApiPropertyOptional({
    enum: PaymentStatus, example: PaymentStatus.PAID,
    description: 'Filter by payment status.',
  })
  @IsOptional() @IsEnum(PaymentStatus)
  paymentStatus?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod, example: PaymentMethod.ONLINE,
    description: 'Filter by payment method: Cash | Online.',
  })
  @IsOptional() @IsEnum(PaymentMethod)
  paymentMethod?: string;

  @ApiPropertyOptional({
    example: 'ORD-20260505-00007',
    description: 'Filter by exact order number.',
  })
  @IsOptional() @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({
    example: '9876543210',
    description: 'Filter by customer mobile number.',
  })
  @IsOptional() @IsString()
  mobile?: string;

  @ApiPropertyOptional({
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'Filter by customer MongoDB ObjectId.',
  })
  @IsOptional() @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: '2026-05-01',
    description: 'Orders placed on or after this date (ISO 8601).',
  })
  @IsOptional() @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-05-31',
    description: 'Orders placed on or before this date (ISO 8601).',
  })
  @IsOptional() @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    example: 'orderTotal',
    enum: ['orderTotal', 'createdAt', 'orderStatus'],
    description: 'Sort field. Default: createdAt.',
  })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    description: 'Sort direction. Default: desc.',
  })
  @IsOptional() @IsString()
  sortOrder?: 'asc' | 'desc';
}

// ── Payments filter ───────────────────────────────────────────────────────────
export class AdminPaymentFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: PaymentGatewayStatus, example: PaymentGatewayStatus.PAID,
    description: 'Filter by Cashfree gateway status.',
  })
  @IsOptional() @IsEnum(PaymentGatewayStatus)
  status?: string;

  @ApiPropertyOptional({
    example: 'ORD-20260505-00007',
    description: 'Filter by exact order number.',
  })
  @IsOptional() @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'Filter by customer MongoDB ObjectId.',
  })
  @IsOptional() @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: '2026-05-01',
    description: 'Payments on or after this date (ISO 8601).',
  })
  @IsOptional() @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-05-31',
    description: 'Payments on or before this date (ISO 8601).',
  })
  @IsOptional() @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    example: 'amount',
    enum: ['amount', 'createdAt', 'status'],
    description: 'Sort field. Default: createdAt.',
  })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional() @IsString()
  sortOrder?: 'asc' | 'desc';
}