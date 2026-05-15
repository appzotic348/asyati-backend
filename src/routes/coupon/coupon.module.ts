import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Coupon, CouponSchema }             from './schemas/coupon.schema';
import { CouponUsage, CouponUsageSchema }   from './schemas/coupon-usage.schema';
import { Cart, CartSchema }                 from '../cart/schemas/cart.schema';
import { Order, OrderSchema }               from '../checkout/schemas/order.schema';
import { CouponService }                    from './coupon.service';
import {
  AdminCouponController,
  CustomerCouponController,
}                                           from './coupon.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name,      schema: CouponSchema      },
      { name: CouponUsage.name, schema: CouponUsageSchema },
      { name: Cart.name,        schema: CartSchema        },
      { name: Order.name,       schema: OrderSchema       },
    ]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [AdminCouponController, CustomerCouponController],
  providers:   [CouponService],
  exports:     [CouponService],
})
export class CouponModule {}