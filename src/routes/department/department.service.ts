import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentFilterDto } from './dto/department.dto';
import { paginate, PaginatedResult } from '../../common/pagination';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentDocument> {
    const exists = await this.departmentModel.findOne({
      name:      { $regex: `^${dto.name}$`, $options: 'i' },
      isDeleted: false,
    });
    if (exists)
      throw new ConflictException(`Department "${dto.name}" already exists`);

    return new this.departmentModel(dto).save();
  }

  async findAll(filters: DepartmentFilterDto): Promise<PaginatedResult<DepartmentDocument>> {
    const query: Record<string, any> = { isDeleted: false };
    if (filters.search)
      query.name = { $regex: filters.search, $options: 'i' };
    if (filters.isActive !== undefined)
      query.isActive = filters.isActive;

    return paginate<DepartmentDocument>(
      this.departmentModel, query,
      { page: filters.page, limit: filters.limit },
      { name: 1 },
    );
  }

  async findById(id: string): Promise<DepartmentDocument> {
    const dept = await this.departmentModel.findOne({ _id: id, isDeleted: false });
    if (!dept) throw new NotFoundException(`Department not found: ${id}`);
    return dept;
  }

  async findByName(name: string): Promise<DepartmentDocument | null> {
    return this.departmentModel.findOne({
      name:      { $regex: `^${name}$`, $options: 'i' },
      isDeleted: false,
    });
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDocument> {
    if (dto.name) {
      const exists = await this.departmentModel.findOne({
        name:      { $regex: `^${dto.name}$`, $options: 'i' },
        isDeleted: false,
        _id:       { $ne: id },
      });
      if (exists)
        throw new ConflictException(`Department "${dto.name}" already exists`);
    }

    const dept = await this.departmentModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: dto },
      { new: true, runValidators: true },
    );
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async remove(id: string): Promise<void> {
    const dept = await this.departmentModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
    );
    if (!dept) throw new NotFoundException('Department not found');
  }
}