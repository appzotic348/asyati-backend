import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaxGuide, TaxGuideSchema } from './schemas/tax-guide.schema';
import { TaxGuideService } from './tax-guide.service';
import { TaxGuideController } from './tax-guide.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TaxGuide.name, schema: TaxGuideSchema }]),
  ],
  controllers: [TaxGuideController],
  providers: [TaxGuideService],
  exports: [TaxGuideService],
})
export class TaxGuideModule {}