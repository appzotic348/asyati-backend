import { Module } from '@nestjs/common';
import { ProductsModule } from './Product/products.module';
import { CustomerProductModule } from './customer-product/customer-product.module';

@Module({
  imports: [
    ProductsModule,
    CustomerProductModule,
  ],
})
export class RoutesModule {}
