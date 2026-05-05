import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CustomerAddress,
  CustomerAddressSchema,
} from './schemas/customer-address.schema';
import { CustomerAddressService } from './customer-address.service';
import { CustomerAddressController } from './customer-address.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerAddress.name, schema: CustomerAddressSchema },
    ]),
  ],
  controllers: [CustomerAddressController],
  providers: [CustomerAddressService],
  exports: [CustomerAddressService],
})
export class CustomerAddressModule {}