import { Module } from '@nestjs/common';
import { ProductsModule } from './Product/products.module';
import { CustomerProductModule } from './customer-product/customer-product.module';
import { CartModule } from './cart/cart.module';
import { CustomerAddressModule } from './customer-address/customer-address.module';

@Module({
  imports: [
    ProductsModule,
    CustomerProductModule,
    CartModule,
    CustomerAddressModule,
  ],
})
export class RoutesModule {}
