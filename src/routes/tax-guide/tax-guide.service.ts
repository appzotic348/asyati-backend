import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaxGuide, TaxGuideDocument } from './schemas/tax-guide.schema';
import { CreateTaxGuideDto, UpdateTaxGuideDto, TaxGuideFilterDto } from './dto/tax-guide.dto';
import { paginate, PaginatedResult } from '../../common/pagination';

@Injectable()
export class TaxGuideService {
  constructor(
    @InjectModel(TaxGuide.name)
    private readonly taxGuideModel: Model<TaxGuideDocument>,
  ) {}

  async create(dto: CreateTaxGuideDto): Promise<TaxGuideDocument> {
    
    const exists = await this.taxGuideModel.findOne({
      name:      { $regex: `^${dto.name}$`, $options: 'i' },
      isDeleted: false,
    });
    if (exists)
      throw new ConflictException(`Tax guide "${dto.name}" already exists`);

    return new this.taxGuideModel(dto).save();
  }

  async findAll(filters: TaxGuideFilterDto): Promise<PaginatedResult<TaxGuideDocument>> {
    const query: Record<string, any> = { isDeleted: false };
    if (filters.search)
      query.name = { $regex: filters.search, $options: 'i' };

    return paginate<TaxGuideDocument>(
      this.taxGuideModel, query,
      { page: filters.page, limit: filters.limit },
      { name: 1 },
    );
  }

  async findById(id: string): Promise<TaxGuideDocument> {
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/))
      throw new NotFoundException(`Tax guide not found: ${id}`);

    const tax = await this.taxGuideModel.findOne({ _id: id, isDeleted: false });
    if (!tax) throw new NotFoundException(`Tax guide not found: ${id}`);
    return tax;
  }

  async findByName(name: string): Promise<TaxGuideDocument | null> {
    return this.taxGuideModel.findOne({
      name:      { $regex: `^${name}$`, $options: 'i' },
      isDeleted: false,
    });
  }

  async update(id: string, dto: UpdateTaxGuideDto): Promise<TaxGuideDocument> {
    if (dto.name) {
      const conflict = await this.taxGuideModel.findOne({
        name:      { $regex: `^${dto.name}$`, $options: 'i' },
        isDeleted: false,
        _id:       { $ne: id },
      });
      if (conflict)
        throw new ConflictException(`Tax guide "${dto.name}" already exists`);
    }

    const tax = await this.taxGuideModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: dto },
      { new: true },
    );
    if (!tax) throw new NotFoundException('Tax guide not found');
    return tax;
  }

  async remove(id: string): Promise<void> {
    const tax = await this.taxGuideModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
    );
    if (!tax) throw new NotFoundException('Tax guide not found');
  }
}