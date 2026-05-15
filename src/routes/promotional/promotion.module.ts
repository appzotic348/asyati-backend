import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Promotion, PromotionSchema }     from './schemas/promotion.schema';
import { PromotionService }               from './promotion.service';
import {
  AdminPromotionController,
  CustomerPromotionController,
}                                         from './promotion.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
    ]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [AdminPromotionController, CustomerPromotionController],
  providers:   [PromotionService],
  exports:     [PromotionService],
})
export class PromotionModule {}