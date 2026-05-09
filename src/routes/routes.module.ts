import { Module } from '@nestjs/common';
import { ProductsModule } from './Product/products.module';
import { CustomerProductModule } from './customer-product/customer-product.module';
import { CartModule } from './cart/cart.module';
import { CustomerAddressModule } from './customer-address/customer-address.module';
import { CheckoutModule } from './checkout/checkout.module';
import { PaymentModule } from './payment/payment.module';
import { AdminOrdersModule } from './admin-orders/admin-orders.module';
// import { ShipmentModule } from './shipment/shipment.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    ProductsModule,
    CustomerProductModule,
    CartModule,
    CustomerAddressModule,
    CheckoutModule,
    PaymentModule,
    AdminOrdersModule,
    // ShipmentModule,
    WishlistModule,
  ],
})
export class RoutesModule {}
