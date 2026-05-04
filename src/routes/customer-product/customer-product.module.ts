import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../Product/schemas/product.schema';
import { CustomerProductService } from './customer-product.service';
import { CustomerProductController } from './customer-product.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [CustomerProductController],
  providers: [CustomerProductService],
})
export class CustomerProductModule {}