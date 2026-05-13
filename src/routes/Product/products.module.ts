import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DepartmentModule } from '../department/department.module';
import { CategoryModule } from '../category/category.module';
import { TaxGuideModule } from '../tax-guide/tax-guide.module';
import { BrandModule } from '../brand/brand.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    MulterModule.register({ storage: memoryStorage() }),
    DepartmentModule,
    CategoryModule,
    TaxGuideModule,
    BrandModule,
    InventoryModule,
  ],
  controllers: [ProductsController],
  providers:   [ProductsService],
  exports:     [ProductsService],
})
export class ProductsModule {}