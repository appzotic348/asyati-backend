import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Promotion,
  PromotionDocument,
  PromotionStatus,
  PromotionTarget,
} from './schemas/promotion.schema';
import {
  CreatePromotionDto,
  FetchActivePromotionsDto,
  FilterPromotionsDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { paginate, PaginatedResult, PaginationDto } from '../../common/pagination';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from '../../common/cloudinary'; 

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
  ) {}

  // ─── ADMIN: Create ────────────────────────────────────────────────────────

  async create(
    dto:         CreatePromotionDto,
    imageFile?:  Express.Multer.File,
    mobileFile?: Express.Multer.File,
  ): Promise<PromotionDocument> {
    let imageUrl:      string | undefined;
    let imagePublicId: string | undefined;
    let mobileImageUrl: string | undefined;

    if (imageFile) {
      const uploaded = await uploadToCloudinary(
        imageFile.buffer,
        'promotions',
        imageFile.originalname,
      );
      imageUrl      = uploaded.url;
      imagePublicId = uploaded.publicId;
    }

    if (mobileFile) {
      const uploaded = await uploadToCloudinary(
        mobileFile.buffer,
        'promotions/mobile',
        mobileFile.originalname,
      );
      mobileImageUrl = uploaded.url;
    }

    const promotion = new this.promotionModel({
      ...dto,
      imageUrl,
      imagePublicId,
      mobileImageUrl,
      startDate:          dto.startDate ? new Date(dto.startDate) : null,
      endDate:            dto.endDate   ? new Date(dto.endDate)   : null,
      targetCategories:   (dto.targetCategories  ?? []).map((id) => new Types.ObjectId(id)),
      targetDepartments:  (dto.targetDepartments ?? []).map((id) => new Types.ObjectId(id)),
      target:             dto.target            ?? PromotionTarget.ALL,
      openInNewTab:       dto.openInNewTab       ?? false,
      popupDelay:         dto.popupDelay         ?? 0,
      popupFrequency:     dto.popupFrequency     ?? 1,
      popupCooldownDays:  dto.popupCooldownDays  ?? 7,
      sortOrder:          dto.sortOrder          ?? 0,
      couponCode:         dto.couponCode         ?? null,
    });

    return promotion.save();
  }

  // ─── ADMIN: List ──────────────────────────────────────────────────────────

  async findAll(
    pagination: PaginationDto,
    filters:    FilterPromotionsDto,
  ): Promise<PaginatedResult<PromotionDocument>> {
    const query: Record<string, any> = { isDeleted: false };

    if (filters.type)      query.type      = filters.type;
    if (filters.placement) query.placement = filters.placement;
    if (filters.status)    query.status    = filters.status;

    if (filters.search) {
      query.$or = [
        { title:        { $regex: filters.search, $options: 'i' } },
        { internalNote: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return paginate<PromotionDocument>(
      this.promotionModel,
      query,
      pagination,
      { sortOrder: 1, createdAt: -1 },
    );
  }

  // ─── ADMIN: Get one ───────────────────────────────────────────────────────

  async findById(id: string): Promise<PromotionDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Promotion not found');

    const promo = await this.promotionModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  // ─── ADMIN: Update ────────────────────────────────────────────────────────

  async update(
    id:          string,
    dto:         UpdatePromotionDto,
    imageFile?:  Express.Multer.File,
    mobileFile?: Express.Multer.File,
  ): Promise<PromotionDocument> {
    const promo = await this.findById(id);

    if (imageFile) {
      if (promo.imagePublicId) {
        await deleteFromCloudinary(promo.imagePublicId).catch(() => {
        });
      }
      const uploaded = await uploadToCloudinary(
        imageFile.buffer,
        'promotions',
        imageFile.originalname,
      );
      promo.imageUrl      = uploaded.url;
      promo.imagePublicId = uploaded.publicId;
    }

    if (mobileFile) {
      const uploaded = await uploadToCloudinary(
        mobileFile.buffer,
        'promotions/mobile',
        mobileFile.originalname,
      );
      promo.mobileImageUrl = uploaded.url;
    }

    const { image: _i, mobileImage: _m, ...scalarDto } = dto as any;

    if (scalarDto.targetCategories)
      (scalarDto as any).targetCategories = scalarDto.targetCategories.map(
        (id: string) => new Types.ObjectId(id),
      );
    if (scalarDto.targetDepartments)
      (scalarDto as any).targetDepartments = scalarDto.targetDepartments.map(
        (id: string) => new Types.ObjectId(id),
      );
    if (scalarDto.startDate) scalarDto.startDate = new Date(scalarDto.startDate);
    if (scalarDto.endDate)   scalarDto.endDate   = new Date(scalarDto.endDate);

    Object.assign(promo, scalarDto);
    return promo.save();
  }

  // ─── ADMIN:  delete ───────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    const promo = await this.findById(id);
    promo.isDeleted = true;
    await promo.save();
  }

  // ─── ADMIN: Bulk reorder ──────────────────────────────────────────────────

  async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.promotionModel.findByIdAndUpdate(id, { sortOrder }),
      ),
    );
  }

  // ─── CUSTOMER: Active promotions ──────────────────────────────────────────

  async getActive(
    query:       FetchActivePromotionsDto,
    customerId?: string,
  ): Promise<PromotionDocument[]> {
    const now = new Date();

    const filter: Record<string, any> = {
      isDeleted: false,
      status:    PromotionStatus.ACTIVE,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null },   { endDate:   { $gte: now } }] },
      ],
    };

    if (query.placement) filter.placement = query.placement;
    if (query.type)      filter.type      = query.type;

    if (!customerId) {
      filter.target = { $in: [PromotionTarget.ALL, PromotionTarget.GUEST] };
    } else {
      filter.target = {
        $in: [
          PromotionTarget.ALL,
          PromotionTarget.LOGGED_IN,
          PromotionTarget.FIRST_TIME,
        ],
      };
    }

    return this.promotionModel
      .find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }
}