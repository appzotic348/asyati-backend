import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Review, ReviewSchema }   from './schemas/review.schema';
import { Order, OrderSchema }     from '../checkout/schemas/order.schema';
import { ReviewService }          from './review.service';
import {
  AdminReviewController,
  CustomerReviewController,
}                                 from './review.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Order.name,  schema: OrderSchema  },
    ]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [AdminReviewController, CustomerReviewController],
  providers:   [ReviewService],
  exports:     [ReviewService],
})
export class ReviewModule {}