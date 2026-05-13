import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Brand, BrandSchema } from './schemas/brand.schema';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [BrandController],
  providers:   [BrandService],
  exports:     [BrandService],
})
export class BrandModule {}