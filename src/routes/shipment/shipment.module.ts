import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shipment, ShipmentSchema } from './schemas/shipment.schema';
import { Order, OrderSchema } from '../checkout/schemas/order.schema';
import { ShipmentService } from './shipment.service';
import { Product, ProductSchema } from '../Product/schemas/product.schema';
import {
  AdminShipmentController,
  CustomerShipmentController,
  EkartWebhookController,
} from './shipment.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shipment.name, schema: ShipmentSchema },
      { name: Order.name,    schema: OrderSchema },
      { name: Product.name,  schema: ProductSchema },
    ]),
  ],
  controllers: [
    CustomerShipmentController,
    EkartWebhookController,   
    AdminShipmentController,
  ],
  providers: [ShipmentService],
  exports:   [ShipmentService],
})
export class ShipmentModule {}