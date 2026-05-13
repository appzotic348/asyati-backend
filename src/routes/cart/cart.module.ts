import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema }             from './schemas/cart.schema';
import { CartService }                  from './cart.service';
import { CartController }               from './cart.controller';
import { Product, ProductSchema }       from '../Product/schemas/product.schema';
import { InventoryModule }              from '../inventory/inventory.module';
import { ShippingConfigModule }         from '../shipping-config/shipping-config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name,    schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    InventoryModule,
    ShippingConfigModule,   
  ],
  controllers: [CartController],
  providers:   [CartService],
  exports:     [CartService],
})
export class CartModule {}