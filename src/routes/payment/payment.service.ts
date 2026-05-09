import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import axios from 'axios';
import {
  Payment, PaymentDocument, PaymentGatewayStatus,
} from './schemas/payment.schema';
import {
  Order, OrderDocument, OrderStatus, PaymentStatus,
} from '../checkout/schemas/order.schema';
import { cashfreeConfig } from '../../config/cashfree.config';
import { paginate, PaginatedResult, PaginationDto } from '../../common/pagination';
// import { ShipmentService } from '../shipment/shipment.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    // private readonly shipmentService: ShipmentService,
  ) {}

  private get cfHeaders() {
    return {
      'x-client-id':     cashfreeConfig.appId,
      'x-client-secret': cashfreeConfig.secretKey,
      'x-api-version':   '2025-01-01',
      'Content-Type':    'application/json',
    };
  }

  private readonly TERMINAL_STATUSES = new Set([
    PaymentGatewayStatus.PAID,
    PaymentGatewayStatus.FAILED,
    PaymentGatewayStatus.CANCELLED,
    PaymentGatewayStatus.REFUNDED,
  ]);

  // 1. INITIATE ──────────────────────────────────────────────────────────────

  async initiatePayment(
    customerId: string,
    orderId:    string,
  ): Promise<{
    cfOrderId:        string;
    paymentSessionId: string;
    amount:           number;
    currency:         string;
    orderNumber:      string;
  }> {
    const order = await this.orderModel.findOne({
      _id:        new Types.ObjectId(orderId),
      customerId: new Types.ObjectId(customerId),
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.paymentMethod !== 'Online')
      throw new BadRequestException('This order is Cash on Delivery — no online payment needed');

    if (order.paymentStatus === PaymentStatus.PAID)
      throw new BadRequestException('This order is already paid');

    const existingPayment = await this.paymentModel.findOne({
      orderNumber: order.orderNumber,
      status: { $in: [PaymentGatewayStatus.CREATED, PaymentGatewayStatus.ACTIVE] },
    });
    if (existingPayment) {
      this.logger.log(`  Returning existing session for: ${order.orderNumber}`);
      return {
        cfOrderId:        existingPayment.cfOrderId,
        paymentSessionId: existingPayment.paymentSessionId,
        amount:           existingPayment.amount,
        currency:         existingPayment.currency,
        orderNumber:      existingPayment.orderNumber,
      };
    }

    const cfPayload = {
      order_id:       order.orderNumber,
      order_amount:   order.orderTotal,
      order_currency: 'INR',
      customer_details: {
        customer_id:    customerId,
        customer_phone: order.mobile,
        customer_email: order.email ?? undefined,
        customer_name:  `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      },
      order_meta: {
        return_url: `${process.env.APP_BASE_URL}/customer/payment/verify/${order.orderNumber}`,
        notify_url: `${process.env.APP_BASE_URL}/customer/payment/webhook`,
      },
    };

    let cfResponse: any;
    try {
      const { data } = await axios.post(
        `${cashfreeConfig.apiBase}/orders`,
        cfPayload,
        { headers: this.cfHeaders },
      );
      cfResponse = data;
      this.logger.log(` CF order created | ourOrder: ${order.orderNumber} | cfOrderId: ${cfResponse.cf_order_id}`);
    } catch (err: any) {
      this.logger.error('Cashfree order creation failed', err?.response?.data ?? err.message);
      throw new InternalServerErrorException('Payment gateway error. Please try again.');
    }

    await this.orderModel.findByIdAndUpdate(orderId, {
      $set: { paymentStatus: PaymentStatus.PENDING },
    });

    const payment = new this.paymentModel({
      orderId:          new Types.ObjectId(orderId),
      customerId:       new Types.ObjectId(customerId),
      orderNumber:      order.orderNumber,
      cfOrderId:        cfResponse.cf_order_id,
      paymentSessionId: cfResponse.payment_session_id,
      amount:           order.orderTotal,
      currency:         'INR',
      status:           PaymentGatewayStatus.CREATED,
    });
    await payment.save();

    return {
      cfOrderId:        cfResponse.cf_order_id,
      paymentSessionId: cfResponse.payment_session_id,
      amount:           order.orderTotal,
      currency:         'INR',
      orderNumber:      order.orderNumber,
    };
  }

  // 2. VERIFY PAYMENT ──────────────────────────────────────────────────────────────

  async verifyPayment(orderNumber: string): Promise<{
    status:  string;
    message: string;
    order?:  OrderDocument;
  }> {
    const payment = await this.paymentModel.findOne({ orderNumber });
    if (!payment) throw new NotFoundException('Payment record not found');

    if (this.TERMINAL_STATUSES.has(payment.status as PaymentGatewayStatus)) {
      this.logger.log(`  Verify skipped — already in terminal status: ${payment.status}`);
      const order = await this.orderModel.findById(payment.orderId);
      const messageMap: Record<string, string> = {
        [PaymentGatewayStatus.PAID]:      'Payment already confirmed',
        [PaymentGatewayStatus.FAILED]:    'Payment has failed',
        [PaymentGatewayStatus.CANCELLED]: 'Payment was cancelled',
        [PaymentGatewayStatus.REFUNDED]:  'Payment was refunded',
      };
      return {
        status:  payment.status,
        message: messageMap[payment.status] ?? 'Payment in final state',
        order:   order ?? undefined,
      };
    }

    let cfData: any;
    try {
      const { data } = await axios.get(
        `${cashfreeConfig.apiBase}/orders/${orderNumber}`,
        { headers: this.cfHeaders },
      );
      cfData = data;
      this.logger.log(` Verify | orderNumber: ${orderNumber} | CF status: ${cfData.order_status}`);
    } catch (err: any) {
      this.logger.error('Cashfree verify failed', err?.response?.data ?? err.message);
      throw new InternalServerErrorException('Could not verify payment. Please try again.');
    }

    const cfStatus: string = cfData.order_status;
    const statusMap: Record<string, PaymentGatewayStatus> = {
      PAID:    PaymentGatewayStatus.PAID,
      ACTIVE:  PaymentGatewayStatus.ACTIVE,
      EXPIRED: PaymentGatewayStatus.EXPIRED,
    };
    payment.status = statusMap[cfStatus] ?? PaymentGatewayStatus.FAILED;
    await payment.save();

    if (cfStatus === 'PAID') {
      const order = await this.markOrderPaid(
        payment.orderId.toString(),
        orderNumber,
        cfData?.cf_payment_id?.toString() ?? null,
      );
      return { status: 'PAID', message: 'Payment successful', order };
    }

    if (cfStatus === 'ACTIVE') {
      return { status: 'PENDING', message: 'Payment not completed yet' };
    }

    return { status: cfStatus, message: 'Payment was not successful' };
  }

  // 3. WEBHOOK HANDLER ──────────────────────────────────────────────────────────────

  async handleWebhook(
    rawBody:   string,
    timestamp: string,
    signature: string,
  ): Promise<void> {
    const signedPayload = `${timestamp}${rawBody}`;
    const expectedSig   = crypto
      .createHmac('sha256', cashfreeConfig.secretKey)
      .update(signedPayload)
      .digest('base64');

    if (expectedSig !== signature) {
      this.logger.warn(` Signature mismatch | expected: ${expectedSig} | got: ${signature}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Invalid webhook JSON payload');
    }

    console.log('\n========== [WEBHOOK RECEIVED] ==========');
    console.log('Event Type    :', payload?.type);
    console.log('CF Order ID   :', payload?.data?.order?.order_id);
    console.log('Payment Status:', payload?.data?.payment?.payment_status);
    console.log('CF Payment ID :', payload?.data?.payment?.cf_payment_id);
    console.log('Full Payload  :\n', JSON.stringify(payload, null, 2));
    console.log('=========================================\n');

    const eventType:     string = payload?.type;
    const orderData             = payload?.data?.order;
    const paymentData           = payload?.data?.payment;
    const orderNumber:   string = orderData?.order_id;
    const cfPaymentId:   string = String(paymentData?.cf_payment_id ?? '');
    const paymentStatus: string = paymentData?.payment_status;

    if (!orderNumber) {
      this.logger.warn('  Webhook missing order_id — ignoring');
      return;
    }

    const payment = await this.paymentModel.findOne({ orderNumber });
    if (!payment) {
      this.logger.warn(`  No payment record for orderNumber: ${orderNumber} — ignoring`);
      return;
    }

    if (payment.status === PaymentGatewayStatus.PAID) {
      this.logger.log(`  Order ${orderNumber} already PAID — skipping duplicate webhook`);
      return;
    }

    payment.webhookPayload    = payload;
    payment.webhookReceivedAt = new Date();

    switch (eventType) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        if (paymentStatus === 'SUCCESS') {
          payment.status      = PaymentGatewayStatus.PAID;
          payment.cfPaymentId = cfPaymentId || null;
          await payment.save();
          await this.markOrderPaid(
            payment.orderId.toString(),
            orderNumber,
            cfPaymentId || null,
          );
        }
        break;

      case 'PAYMENT_FAILED_WEBHOOK':
        payment.status      = PaymentGatewayStatus.FAILED;
        payment.cfPaymentId = cfPaymentId || null;
        await payment.save();
        await this.orderModel.findByIdAndUpdate(payment.orderId, {
          $set: { paymentStatus: PaymentStatus.FAILED },
        });
        this.logger.log(` Payment FAILED | order: ${orderNumber}`);
        break;

      case 'PAYMENT_USER_DROPPED_WEBHOOK':
        payment.status = PaymentGatewayStatus.CANCELLED;
        await payment.save();
        this.logger.log(` Payment DROPPED | order: ${orderNumber}`);
        break;

      case 'PAYMENT_PENDING_WEBHOOK':
        payment.status = PaymentGatewayStatus.PENDING;
        await payment.save();
        this.logger.log(` Payment PENDING | order: ${orderNumber}`);
        break;

      default:
        this.logger.log(`  Unhandled event: ${eventType}`);
        await payment.save();
    }
  }

  // 4. GET PAYMENT STATUS ──────────────────────────────────────────────────────────────

  async getPaymentStatus(
    customerId: string,
    orderId:    string,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({
      orderId:    new Types.ObjectId(orderId),
      customerId: new Types.ObjectId(customerId),
    });
    if (!payment) throw new NotFoundException('Payment not found for this order');
    return payment;
  }

  // 5. GET PAYMENT HISTORY  ──────────────────────────────────────────────────────────────

  async getPaymentHistory(
    customerId: string,
    pagination: PaginationDto,
    status?:    string,
  ): Promise<PaginatedResult<PaymentDocument>> {
    const filter: Record<string, any> = {
      customerId: new Types.ObjectId(customerId),
    };

    if (status) filter.status = status;

    return paginate<PaymentDocument>(
      this.paymentModel,
      filter,
      pagination,
      { createdAt: -1 },
    );
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async markOrderPaid(
    orderId:     string,
    orderNumber: string,
    cfPaymentId: string | null,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        $set: {
          paymentStatus:    PaymentStatus.PAID,
          orderStatus:      OrderStatus.CONFIRMED,
          paymentReference: cfPaymentId ?? orderNumber,
        },
      },
      { new: true },
    );
    if (!order) throw new NotFoundException('Order not found while marking as paid');
    this.logger.log(` Order ${order.orderNumber} → PAID + CONFIRMED`);

  
    // try {
    //   await this.shipmentService.createShipment(orderId);

    //   console.log("shipmer mark ad paid ----------------------------------------------------------->",order)
    //   this.logger.log(
    //     ` Online shipment created for order ${order.orderNumber}`,
    //   );
    // } catch (err) {
    //   this.logger.warn(
    //     `Online shipment creation failed for ${order.orderNumber}: ${(err as Error).message}`,
    //   );
    // }

    return order;
  }
}