import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

  async create(dto: CreateCustomerDto): Promise<CustomerDocument> {
    // Only check mobile uniqueness among active (non-deleted) customers
    const mobileExists = await this.customerModel.findOne({
      mobile: dto.mobile.trim(),
      isDeleted: false,
    });
    if (mobileExists) throw new ConflictException('Mobile number already registered');

    // Email is optional — only check if provided, allow duplicates across deleted accounts
    if (dto.email) {
      const emailExists = await this.customerModel.findOne({
        email: dto.email.toLowerCase().trim(),
        isDeleted: false,
      });
      if (emailExists) throw new ConflictException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const customer = new this.customerModel({ ...dto, password: hashed });
    return customer.save();
  }

  async findByMobile(mobile: string): Promise<CustomerDocument | null> {
    return this.customerModel
      .findOne({ mobile: mobile.trim(), isDeleted: false })
      .select('+password');
  }

  async findById(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findOne({
      _id: id,
      isDeleted: false,
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async updateProfile(
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDocument> {
    if (dto.password) {
      (dto as any).password = await bcrypt.hash(dto.password, 12);
    }

    // If mobile is being updated, check uniqueness among active customers only
    if (dto.mobile) {
      const conflict = await this.customerModel.findOne({
        mobile: dto.mobile.trim(),
        _id: { $ne: id },
        isDeleted: false,
      });
      if (conflict) throw new ConflictException('Mobile number already in use');
    }

    const customer = await this.customerModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: dto },
      { new: true, runValidators: true },
    );
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async softDelete(id: string): Promise<void> {
    const customer = await this.customerModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
    );
    if (!customer) throw new NotFoundException('Customer not found');
  }
}