import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schemas/cart.schema';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
// import { InventoryModule } from '../inventory/inventory.module';
import { Product, ProductSchema } from '../Product/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name,    schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    // InventoryModule,  // provides InventoryService for stock reserve/release
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],  // exported so OrderService can call confirmSale later
})
export class CartModule {}