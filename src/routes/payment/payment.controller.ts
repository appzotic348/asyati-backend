import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { join } from 'path';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto, PaymentHistoryFilterDto } from './dto/payment.dto';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse } from '../../common/response';

@ApiTags('Customer - Payment')
@Controller('customer/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── TEST PAGE ─────────────────────────────────────────────────────────────

  @Get('test-page')
  @ApiOperation({ summary: 'Payment test HTML page (browser only)' })
  testPage(@Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public', 'payment.html'));
  }

  // ── INITIATE PAYMENT ──────────────────────────────────────────────────────

  @Post('initiate')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Initiate online payment for an order',
    description:
      'Creates a Cashfree payment session.\n\n' +
      'Returns `paymentSessionId` — pass to Cashfree JS SDK on frontend.\n\n' +
      'Only works for orders with `paymentMethod: Online`.',
  })
  @ApiResponse({ status: 201, description: 'Payment session created.' })
  @ApiResponse({ status: 400, description: 'Order is COD or already paid.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 500, description: 'Cashfree API error.' })
  async initiatePayment(
    @GetUser() customer: CustomerDocument,
    @Body() dto: InitiatePaymentDto,
  ) {
    const result = await this.paymentService.initiatePayment(
      (customer as any)._id.toString(),
      dto.orderId,
    );
    return successResponse(result, { message: 'Payment session created' });
  }

  // ── VERIFY PAYMENT ────────────────────────────────────────────────────────

  @Get('verify/:orderNumber')
  @ApiOperation({
    summary: 'Verify payment after redirect or modal close',
    description:
      'Called by frontend after payment modal closes or after redirect.\n\n' +
      'If webhook already set a final status → returns immediately without API call.\n\n' +
      'If webhook not yet received → calls Cashfree and updates status.',
  })
  @ApiParam({ name: 'orderNumber', example: 'ORD-20260505-00007' })
  @ApiResponse({ status: 200, description: 'Payment status returned.' })
  @ApiResponse({ status: 404, description: 'Payment record not found.' })
  @ApiResponse({ status: 500, description: 'Cashfree API error.' })
  async verifyPayment(@Param('orderNumber') orderNumber: string) {
    const result = await this.paymentService.verifyPayment(orderNumber);
    return successResponse(result);
  }

  // ── WEBHOOK ───────────────────────────────────────────────────────────────

  @Post('webhook')
  @ApiOperation({
    summary: 'Cashfree webhook — do not call manually',
    description: 'Cashfree calls this server-to-server after payment events.',
  })
  @ApiResponse({ status: 200, description: 'Processed.' })
  @ApiResponse({ status: 400, description: 'Bad signature.' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Headers('x-webhook-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(req.body);
    await this.paymentService.handleWebhook(rawBody, timestamp, signature);
    return { success: true };
  }

  // ── GET PAYMENT STATUS ────────────────────────────────────────────────────

  @Get('status/:orderId')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({ summary: 'Get payment record for an order' })
  @ApiParam({ name: 'orderId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Payment record returned.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  async getStatus(
    @GetUser() customer: CustomerDocument,
    @Param('orderId') orderId: string,
  ) {
    const payment = await this.paymentService.getPaymentStatus(
      (customer as any)._id.toString(),
      orderId,
    );
    return successResponse(payment);
  }

  // ── GET PAYMENT HISTORY ───────────────────────────────────────────────────

  @Get('history')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Get payment history',
    description:
      'Returns all payment records for the customer.\n\n' +
      '**Filters:** `status` (CREATED | ACTIVE | PAID | EXPIRED | FAILED | CANCELLED | PENDING | REFUNDED)\n\n' +
      '**Pagination:** `page` + `limit`. Omit both to get all records.',
  })
  @ApiResponse({ status: 200, description: 'Payment history returned.' })
  async getHistory(
    @GetUser() customer: CustomerDocument,
    @Query() filters: PaymentHistoryFilterDto,
  ) {
    const result = await this.paymentService.getPaymentHistory(
      (customer as any)._id.toString(),
      { page: filters.page, limit: filters.limit },
      filters.status,
    );
    return successResponse(result.data, { meta: result.meta as any });
  }
}