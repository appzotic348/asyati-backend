import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { Cart, CartSchema } from '../cart/schemas/cart.schema';
import {
  CustomerAddress,
  CustomerAddressSchema,
} from '../customer-address/schemas/customer-address.schema';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
// import { ShipmentModule } from '../shipment/shipment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name,           schema: OrderSchema },
      { name: Cart.name,            schema: CartSchema },
      { name: CustomerAddress.name, schema: CustomerAddressSchema },
    ]),
    // ShipmentModule,  
  ],
  controllers: [CheckoutController],
  providers:   [CheckoutService],
  exports:     [CheckoutService],
})
export class CheckoutModule {}