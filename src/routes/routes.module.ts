import { Module } from '@nestjs/common';
import { ProductsModule } from './Product/products.module';
import { CustomerProductModule } from './customer-product/customer-product.module';
import { CartModule } from './cart/cart.module';
import { CustomerAddressModule } from './customer-address/customer-address.module';
import { CheckoutModule } from './checkout/checkout.module';
import { PaymentModule } from './payment/payment.module';
import { AdminOrdersModule } from './admin-orders/admin-orders.module';
import { ShipmentModule } from './shipment/shipment.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { DepartmentModule } from './department/department.module';
import { CategoryModule }   from './category/category.module';
import { TaxGuideModule }   from './tax-guide/tax-guide.module';
import { InventoryModule }  from './inventory/inventory.module';
import { BrandModule } from './brand/brand.module';
import { ShippingConfigModule } from './shipping-config/shipping-config.module';

@Module({
  imports: [
    ProductsModule,
    CustomerProductModule,
    CartModule,
    CustomerAddressModule,
    CheckoutModule,
    PaymentModule,
    AdminOrdersModule,
    ShipmentModule,
    WishlistModule,
    DepartmentModule,
    CategoryModule,
    TaxGuideModule,
    InventoryModule,
    BrandModule,
    ShippingConfigModule,
  ],
})
export class RoutesModule {}
