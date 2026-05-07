import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../checkout/schemas/order.schema';
import { Payment, PaymentSchema } from '../payment/schemas/payment.schema';
import { AdminOrdersService } from './admin-orders.service';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name,   schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [AdminOrdersController],
  providers:   [AdminOrdersService],
})
export class AdminOrdersModule {}