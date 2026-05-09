import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wishlist, WishlistSchema } from './schemas/wishlist.schema';
import { Product, ProductSchema } from '../Product/schemas/product.schema';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Product.name,  schema: ProductSchema  },
    ]),
  ],
  controllers: [WishlistController],
  providers:   [WishlistService],
  exports:     [WishlistService],
})
export class WishlistModule {}