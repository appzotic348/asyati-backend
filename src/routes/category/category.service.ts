import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryFilterDto,
} from './dto/category.dto';
import { DepartmentService } from '../department/department.service';
import { paginate, PaginatedResult } from '../../common/pagination';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly departmentService: DepartmentService,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    await this.departmentService.findById(dto.departmentId);

    const exists = await this.categoryModel.findOne({
      departmentId: new Types.ObjectId(dto.departmentId),
      name: { $regex: `^${dto.name}$`, $options: 'i' },
      isDeleted: false,
    });
    if (exists)
      throw new ConflictException(
        `Category "${dto.name}" already exists in this department`,
      );

    return new this.categoryModel({
      ...dto,
      departmentId: new Types.ObjectId(dto.departmentId),
    }).save();
  }

  async findAll(
    filters: CategoryFilterDto,
  ): Promise<PaginatedResult<CategoryDocument>> {
    const query: Record<string, any> = { isDeleted: false };
    if (filters.departmentId)
      query.departmentId = new Types.ObjectId(filters.departmentId);
    if (filters.search) query.name = { $regex: filters.search, $options: 'i' };
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return paginate<CategoryDocument>(
      this.categoryModel,
      query,
      { page: filters.page, limit: filters.limit },
      { name: 1 },
    );
  }

  async findById(id: string): Promise<CategoryDocument> {
    const cat = await this.categoryModel
      .findOne({ _id: id, isDeleted: false })
      .populate('departmentId', 'name');
    if (!cat) throw new NotFoundException(`Category not found: ${id}`);
    return cat;
  }

  async findByNameAndDepartment(
    name: string,
    departmentId: string,
  ): Promise<CategoryDocument | null> {
    return this.categoryModel.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      departmentId: new Types.ObjectId(departmentId),
      isDeleted: false,
    });
  }

  async validateCategoryBelongsToDepartment(
    categoryId: string,
    departmentId: string,
  ): Promise<CategoryDocument> {
    if (!Types.ObjectId.isValid(categoryId))
      throw new BadRequestException(`Invalid categoryId: ${categoryId}`);
    if (!Types.ObjectId.isValid(departmentId))
      throw new BadRequestException(`Invalid departmentId: ${departmentId}`);

    const cat = await this.categoryModel.findOne({
      _id: new Types.ObjectId(categoryId),
      departmentId: new Types.ObjectId(departmentId),
      isDeleted: false,
    });
    if (!cat)
      throw new BadRequestException(
        `Category "${categoryId}" does not belong to department "${departmentId}" or does not exist`,
      );
    return cat;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    const existing = await this.findById(id);

    if (dto.name) {
      const conflict = await this.categoryModel.findOne({
        departmentId: existing.departmentId,
        name: { $regex: `^${dto.name}$`, $options: 'i' },
        isDeleted: false,
        _id: { $ne: id },
      });
      if (conflict)
        throw new ConflictException(
          `Category "${dto.name}" already exists in this department`,
        );
    }

    const cat = await this.categoryModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: dto },
      { new: true, runValidators: true },
    );
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async remove(id: string): Promise<void> {
    const cat = await this.categoryModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
    );
    if (!cat) throw new NotFoundException('Category not found');
  }
}
