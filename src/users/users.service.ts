import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, SUPER_ADMIN_ROLE } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { PaginationDto, paginate } from '../common/pagination';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  // ─── CREATE (Super Admin only) ────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<UserDocument> {
    // ✅ Block assigning superadmin role via API
    if (dto.role === SUPER_ADMIN_ROLE) {
      throw new BadRequestException(
        `Role "${SUPER_ADMIN_ROLE}" cannot be assigned via API`,
      );
    }

    const emailExists = await this.userModel.findOne({
      email: dto.email.toLowerCase().trim(),
      isDeleted: false,
    });
    if (emailExists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = new this.userModel({
      ...dto,
      email: dto.email.toLowerCase().trim(),
      password: hashed,
    });
    return user.save();
  }

  // ─── GET ALL (paginated) ──────────────────────────────────────────────────

  async findAll(pagination: PaginationDto) {
    return paginate<UserDocument>(
      this.userModel,
      { isDeleted: false },
      pagination,
    );
  }

  // ─── GET ONE ──────────────────────────────────────────────────────────────

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('User not found');
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim(), isDeleted: false })
      .select('+password');
  }

  // ─── UPDATE OWN PROFILE ─────────────────────────────

  async updateMyProfile(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const { username, password, mobileNumber } = dto;
    const safeUpdate: Record<string, any> = {};

    if (username !== undefined) safeUpdate.username = username;
    if (mobileNumber !== undefined) safeUpdate.mobileNumber = mobileNumber;
    if (password) safeUpdate.password = await bcrypt.hash(password, 12);

    if (Object.keys(safeUpdate).length === 0) {
      throw new BadRequestException('No valid fields provided to update');
    }

    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('User not found');

    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), isDeleted: false },
      { $set: safeUpdate },
      { new: true, runValidators: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── UPDATE ANY USER (Super Admin only) ──────────────────────────────────

  async adminUpdateUser(
    targetId: string,
    dto: AdminUpdateUserDto,
    requestingUserId: string,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(targetId)) throw new NotFoundException('User not found');

    if (dto.role === SUPER_ADMIN_ROLE) {
      throw new BadRequestException(
        `Role "${SUPER_ADMIN_ROLE}" cannot be assigned via API`,
      );
    }

    const target = await this.findById(targetId);
    if (
      target.role === SUPER_ADMIN_ROLE &&
      target._id.toString() !== requestingUserId
    ) {
      throw new ForbiddenException('Cannot modify another super admin account');
    }

    const safeUpdate: Record<string, any> = {};
    if (dto.username !== undefined) safeUpdate.username = dto.username;
    if (dto.role !== undefined) safeUpdate.role = dto.role.toLowerCase().trim();
    if (dto.mobileNumber !== undefined) safeUpdate.mobileNumber = dto.mobileNumber;
    if (dto.password) safeUpdate.password = await bcrypt.hash(dto.password, 12);

    if (Object.keys(safeUpdate).length === 0) {
      throw new BadRequestException('No valid fields provided to update');
    }

    const updated = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(targetId), isDeleted: false },
      { $set: safeUpdate },
      { new: true, runValidators: true },
    );
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  // ─── SOFT DELETE (Super Admin only) ──────────────────────────────────────

  async softDelete(id: string, requestingUserId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('User not found');

    if (id === requestingUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const target = await this.findById(id);

    if (target.role === SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Cannot delete a super admin account');
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), isDeleted: false },
      { isDeleted: true },
    );
    if (!user) throw new NotFoundException('User not found');
  }
}