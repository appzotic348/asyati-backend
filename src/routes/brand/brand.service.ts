import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand, BrandDocument } from './schemas/brand.schema';
import { CreateBrandDto, UpdateBrandDto, BrandFilterDto } from './dto/brand.dto';
import { uploadToCloudinary, deleteFromCloudinary } from '../../common/cloudinary';
import { paginate, PaginatedResult } from '../../common/pagination';

@Injectable()
export class BrandService {
  constructor(
    @InjectModel(Brand.name)
    private readonly brandModel: Model<BrandDocument>,
  ) {}

  async create(
    dto: CreateBrandDto,
    logoFile?: Express.Multer.File,
  ): Promise<BrandDocument> {
    const exists = await this.brandModel.findOne({
      name:      { $regex: `^${dto.name}$`, $options: 'i' },
      isDeleted: false,
    });
    if (exists) throw new ConflictException(`Brand "${dto.name}" already exists`);

    let logo: { url: string; publicId: string } | undefined;
    if (logoFile) {
      const res = await uploadToCloudinary(logoFile.buffer, 'brands/logos', logoFile.originalname);
      logo = { url: res.url, publicId: res.publicId };
    }

    return new this.brandModel({ ...dto, logo }).save();
  }

  async findAll(filters: BrandFilterDto): Promise<PaginatedResult<BrandDocument>> {
    const query: Record<string, any> = { isDeleted: false };
    if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

    return paginate<BrandDocument>(
      this.brandModel, query,
      { page: filters.page, limit: filters.limit },
      { name: 1 },
    );
  }

  async findById(id: string): Promise<BrandDocument> {
    const brand = await this.brandModel.findOne({ _id: id, isDeleted: false });
    if (!brand) throw new NotFoundException(`Brand not found: ${id}`);
    return brand;
  }

  async findByName(name: string): Promise<BrandDocument | null> {
    return this.brandModel.findOne({
      name:      { $regex: `^${name}$`, $options: 'i' },
      isDeleted: false,
    });
  }

  async update(
    id: string,
    dto: UpdateBrandDto,
    logoFile?: Express.Multer.File,
  ): Promise<BrandDocument> {
    const brand = await this.findById(id);

    if (dto.name) {
      const conflict = await this.brandModel.findOne({
        name:      { $regex: `^${dto.name}$`, $options: 'i' },
        isDeleted: false,
        _id:       { $ne: id },
      });
      if (conflict) throw new ConflictException(`Brand "${dto.name}" already exists`);
    }

    const updateData: Record<string, any> = { ...dto };
    delete updateData.logo;

    if (logoFile) {
      if (brand.logo?.publicId) await deleteFromCloudinary(brand.logo.publicId);
      const res = await uploadToCloudinary(logoFile.buffer, 'brands/logos', logoFile.originalname);
      updateData.logo = { url: res.url, publicId: res.publicId };
    }

    const updated = await this.brandModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updateData },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Brand not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const brand = await this.brandModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
    );
    if (!brand) throw new NotFoundException('Brand not found');
  }
}