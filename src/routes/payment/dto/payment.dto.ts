import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/pagination';
import { PaymentGatewayStatus } from '../schemas/payment.schema';

export class InitiatePaymentDto {
  @ApiProperty({
    example:     '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'MongoDB ObjectId of the order to pay for.',
  })
  @IsMongoId()
  orderId: string;
}

export class PaymentHistoryFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    enum:        PaymentGatewayStatus,
    example:     PaymentGatewayStatus.PAID,
    description: 'Filter by payment status.',
  })
  @IsOptional()
  @IsEnum(PaymentGatewayStatus)
  status?: string;
}