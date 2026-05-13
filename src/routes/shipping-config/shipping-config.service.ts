import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ShippingConfig,
  ShippingConfigDocument,
} from './schemas/shipping-config.schema';
import { UpdateShippingConfigDto } from './dto/shipping-config.dto';

@Injectable()
export class ShippingConfigService implements OnModuleInit {
  constructor(
    @InjectModel(ShippingConfig.name)
    private readonly model: Model<ShippingConfigDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.model.countDocuments();
    if (count === 0) {
      await this.model.create({ shippingCharge: 99, freeShippingAbove: 999 });
    }
  }

  async getConfig(): Promise<ShippingConfigDocument> {
    const cfg = await this.model.findOne().sort({ createdAt: 1 });
    return cfg!;
  }

  async updateConfig(
    dto: UpdateShippingConfigDto,
  ): Promise<ShippingConfigDocument> {
    const cfg = await this.getConfig();
    cfg.shippingCharge  = dto.shippingCharge;
    cfg.freeShippingAbove = dto.freeShippingAbove;
    cfg.note = dto.note ?? null;
    return cfg.save();
  }
}