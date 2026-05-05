import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CustomerAddress,
  CustomerAddressDocument,
} from './schemas/customer-address.schema';
import { CreateAddressDto, UpdateAddressDto } from './dto/customer-address.dto';

const MAX_ADDRESSES = 5;

@Injectable()
export class CustomerAddressService {
  constructor(
    @InjectModel(CustomerAddress.name)
    private readonly addressModel: Model<CustomerAddressDocument>,
  ) {}

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async create(
    customerId: string,
    dto: CreateAddressDto,
  ): Promise<CustomerAddressDocument> {
    const count = await this.addressModel.countDocuments({
      customerId: new Types.ObjectId(customerId),
      isDeleted: false,
    });
    if (count >= MAX_ADDRESSES)
      throw new BadRequestException(
        `You can save a maximum of ${MAX_ADDRESSES} addresses`,
      );

    if (dto.isDefault || count === 0) {
      await this.clearDefault(customerId);
    }

    const address = new this.addressModel({
      ...dto,
      customerId:  new Types.ObjectId(customerId),
      country:     dto.country ?? 'India',
      isDefault:   dto.isDefault ?? count === 0, 
    });

    return address.save();
  }

  // ─── GET ALL ──────────────────────────────────────────────────────────────

  async findAll(customerId: string): Promise<CustomerAddressDocument[]> {
    return this.addressModel
      .find({ customerId: new Types.ObjectId(customerId), isDeleted: false })
      .sort({ isDefault: -1, createdAt: -1 }) 
      .exec();
  }

  // ─── GET ONE ──────────────────────────────────────────────────────────────

  async findOne(
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddressDocument> {
    return this.getOwnedAddress(customerId, addressId);
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(
    customerId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<CustomerAddressDocument> {
    await this.getOwnedAddress(customerId, addressId); 

    if (dto.isDefault) await this.clearDefault(customerId);

    const updated = await this.addressModel.findOneAndUpdate(
      {
        _id:        new Types.ObjectId(addressId),
        customerId: new Types.ObjectId(customerId),
        isDeleted:  false,
      },
      { $set: dto },
      { new: true, runValidators: true },
    );
    if (!updated) throw new NotFoundException('Address not found');
    return updated;
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────

  async remove(customerId: string, addressId: string): Promise<void> {
    const address = await this.getOwnedAddress(customerId, addressId);
    address.isDeleted = true;

    if (address.isDefault) {
      await address.save();
      const next = await this.addressModel
        .findOne({ customerId: new Types.ObjectId(customerId), isDeleted: false })
        .sort({ createdAt: -1 });
      if (next) { next.isDefault = true; await next.save(); }
    } else {
      await address.save();
    }
  }

  // ─── SET DEFAULT ──────────────────────────────────────────────────────────

  async setDefault(
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddressDocument> {
    await this.getOwnedAddress(customerId, addressId);
    await this.clearDefault(customerId);

    const updated = await this.addressModel.findOneAndUpdate(
      {
        _id:        new Types.ObjectId(addressId),
        customerId: new Types.ObjectId(customerId),
        isDeleted:  false,
      },
      { $set: { isDefault: true } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Address not found');
    return updated;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getOwnedAddress(
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddressDocument> {
    if (!Types.ObjectId.isValid(addressId))
      throw new NotFoundException('Address not found');

    const address = await this.addressModel.findOne({
      _id:        new Types.ObjectId(addressId),
      customerId: new Types.ObjectId(customerId),
      isDeleted:  false,
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  private async clearDefault(customerId: string): Promise<void> {
    await this.addressModel.updateMany(
      { customerId: new Types.ObjectId(customerId), isDefault: true },
      { $set: { isDefault: false } },
    );
  }
}