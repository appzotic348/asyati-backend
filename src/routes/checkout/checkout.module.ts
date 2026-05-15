import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema }             from './schemas/order.schema';
import { Cart, CartSchema }               from '../cart/schemas/cart.schema';
import {
  CustomerAddress,
  CustomerAddressSchema,
} from '../customer-address/schemas/customer-address.schema';
import { CheckoutService }                from './checkout.service';
import { CheckoutController }             from './checkout.controller';
import { ShippingConfigModule }           from '../shipping-config/shipping-config.module';
import { ShipmentModule }                 from '../shipment/shipment.module';
import { CouponModule }                   from '../coupon/coupon.module'; // ← NEW

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name,           schema: OrderSchema },
      { name: Cart.name,            schema: CartSchema },
      { name: CustomerAddress.name, schema: CustomerAddressSchema },
    ]),
    ShippingConfigModule,
    ShipmentModule,
    CouponModule, 
  ],
  controllers: [CheckoutController],
  providers:   [CheckoutService],
  exports:     [CheckoutService],
})
export class CheckoutModule {}