import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ShippingConfig,
  ShippingConfigSchema,
} from './schemas/shipping-config.schema';
import { ShippingConfigService }    from './shipping-config.service';
import { ShippingConfigController } from './shipping-config.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShippingConfig.name, schema: ShippingConfigSchema },
    ]),
  ],
  controllers: [ShippingConfigController],
  providers:   [ShippingConfigService],
  exports:     [ShippingConfigService],  
})
export class ShippingConfigModule {}