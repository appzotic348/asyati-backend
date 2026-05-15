import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import {
  Coupon, CouponDocument, CouponScope, CouponStatus, DiscountType,
} from './schemas/coupon.schema';
import { CouponUsage, CouponUsageDocument } from './schemas/coupon-usage.schema';
import {
  ApplyCouponDto, CreateCouponDto, FilterCouponsDto, UpdateCouponDto,
} from './dto/coupon.dto';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { Order, OrderDocument } from '../checkout/schemas/order.schema';
import { paginate, PaginatedResult, PaginationDto } from '../../common/pagination';

export interface CouponValidationResult {
  coupon:          CouponDocument;
  discountAmount:  number;
  finalTotal:      number;
}

@Injectable()
export class CouponService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private readonly usageModel:  Model<CouponUsageDocument>,
    @InjectModel(Cart.name)
    private readonly cartModel:   Model<CartDocument>,
    @InjectModel(Order.name)
    private readonly orderModel:  Model<OrderDocument>,
  ) {}

  // ─── ADMIN: Create ────────────────────────────────────────────────────────

  async create(dto: CreateCouponDto): Promise<CouponDocument> {
    const code = dto.code.trim().toUpperCase();
    const exists = await this.couponModel.findOne({ code });
    if (exists) throw new BadRequestException(`Coupon code "${code}" already exists`);

    const coupon = new this.couponModel({
      ...dto,
      code,
      discountValue:       dto.discountValue      ?? 0,
      maxDiscountAmount:   dto.maxDiscountAmount   ?? null,
      minOrderValue:       dto.minOrderValue       ?? 0,
      maxOrderValue:       dto.maxOrderValue       ?? 0,
      totalUsageLimit:     dto.totalUsageLimit     ?? 0,
      perCustomerLimit:    dto.perCustomerLimit    ?? 1,
      firstTimeOnly:       dto.firstTimeOnly       ?? false,
      applicableProducts:  (dto.applicableProducts  ?? []).map(id => new Types.ObjectId(id)),
      applicableCategories:(dto.applicableCategories ?? []).map(id => new Types.ObjectId(id)),
      applicableDepartments:(dto.applicableDepartments ?? []).map(id => new Types.ObjectId(id)),
      startDate:           new Date(dto.startDate),
      endDate:             new Date(dto.endDate),
    });

    return coupon.save();
  }

  // ─── ADMIN: Bulk create from Excel ────────────────────────────────────────

  async createBulkFromExcel(
    file: Express.Multer.File,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const workbook  = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet     = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) throw new BadRequestException('Excel file is empty');

    let success = 0;
    let failed  = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; 

      try {
        const code = String(row['Code'] ?? '').trim().toUpperCase();
        if (!code) { errors.push(`Row ${rowNum}: Code is required`); failed++; continue; }

        const discountType = row['Discount Type'] as DiscountType;
        if (!Object.values(DiscountType).includes(discountType)) {
          errors.push(`Row ${rowNum}: Invalid Discount Type "${discountType}"`);
          failed++; continue;
        }

        const scope = (row['Scope'] ?? CouponScope.ALL) as CouponScope;

        const dto: CreateCouponDto = {
          code,
          description:      row['Description']       ?? undefined,
          discountType,
          discountValue:    Number(row['Discount Value'] ?? 0),
          maxDiscountAmount:row['Max Discount Amount'] ? Number(row['Max Discount Amount']) : undefined,
          scope,
          minOrderValue:    Number(row['Min Order Value']     ?? 0),
          maxOrderValue:    Number(row['Max Order Value']     ?? 0),
          totalUsageLimit:  Number(row['Total Usage Limit']   ?? 0),
          perCustomerLimit: Number(row['Per Customer Limit']  ?? 1),
          startDate:        row['Start Date'] ? new Date(row['Start Date']).toISOString() : new Date().toISOString(),
          endDate:          row['End Date']   ? new Date(row['End Date']).toISOString()   : '',
          firstTimeOnly:    String(row['First Time Only'] ?? '').toLowerCase() === 'true',
        };

        if (!dto.endDate) { errors.push(`Row ${rowNum}: End Date is required`); failed++; continue; }

        await this.create(dto);
        success++;
      } catch (err) {
        errors.push(`Row ${rowNum}: ${(err as Error).message}`);
        failed++;
      }
    }

    return { success, failed, errors };
  }

  // ─── ADMIN: List ──────────────────────────────────────────────────────────

  async findAll(
    pagination: PaginationDto,
    filters:    FilterCouponsDto,
  ): Promise<PaginatedResult<CouponDocument>> {
    const query: Record<string, any> = { isDeleted: false };

    if (filters.status)       query.status       = filters.status;
    if (filters.scope)        query.scope        = filters.scope;
    if (filters.discountType) query.discountType = filters.discountType;

    if (filters.search) {
      query.$or = [
        { code:        { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return paginate<CouponDocument>(this.couponModel, query, pagination, { createdAt: -1 });
  }

  // ─── ADMIN: Get one ───────────────────────────────────────────────────────

  async findById(id: string): Promise<CouponDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Coupon not found');
    const coupon = await this.couponModel.findOne({ _id: new Types.ObjectId(id), isDeleted: false });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  // ─── ADMIN: Update ────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCouponDto): Promise<CouponDocument> {
    const coupon = await this.findById(id);

    const updates: Partial<CouponDocument> = { ...dto } as any;
    if (dto.applicableProducts)   updates.applicableProducts   = dto.applicableProducts.map(p => new Types.ObjectId(p)) as any;
    if (dto.applicableCategories) updates.applicableCategories = dto.applicableCategories.map(c => new Types.ObjectId(c)) as any;
    if (dto.applicableDepartments)updates.applicableDepartments= dto.applicableDepartments.map(d => new Types.ObjectId(d)) as any;
    if (dto.startDate) (updates as any).startDate = new Date(dto.startDate);
    if (dto.endDate)   (updates as any).endDate   = new Date(dto.endDate);

    Object.assign(coupon, updates);
    return coupon.save();
  }

  // ─── ADMIN: delete ───────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    const coupon = await this.findById(id);
    coupon.isDeleted = true;
    await coupon.save();
  }

  // ─── ADMIN: Usage stats ───────────────────────────────────────────────────

  async getUsageStats(
    id: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<CouponUsageDocument>> {
    await this.findById(id);
    return paginate<CouponUsageDocument>(
      this.usageModel,
      { couponId: new Types.ObjectId(id) },
      pagination,
      { createdAt: -1 },
    );
  }

  // ─── CUSTOMER: Validate & preview discount ────────────────────────────────

  async validateCoupon(
    dto:        ApplyCouponDto,
    customerId: string,
  ): Promise<CouponValidationResult> {
    const coupon = await this.couponModel.findOne({
      code:      dto.code.trim().toUpperCase(),
      isDeleted: false,
      status:    CouponStatus.ACTIVE,
    });
    if (!coupon) throw new BadRequestException('Invalid or expired coupon code');

    const now = new Date();
    if (now < coupon.startDate) throw new BadRequestException('Coupon is not yet active');
    if (now > coupon.endDate)   throw new BadRequestException('Coupon has expired');

    if (coupon.totalUsageLimit > 0 && coupon.usedCount >= coupon.totalUsageLimit)
      throw new BadRequestException('Coupon usage limit has been reached');

    if (coupon.perCustomerLimit > 0) {
      const customerUses = await this.usageModel.countDocuments({
        couponId:   coupon._id,
        customerId: new Types.ObjectId(customerId),
      });
      if (customerUses >= coupon.perCustomerLimit)
        throw new BadRequestException('You have already used this coupon the maximum number of times');
    }

    if (coupon.firstTimeOnly) {
      const previousOrders = await this.orderModel.countDocuments({
        customerId: new Types.ObjectId(customerId),
      });
      if (previousOrders > 0)
        throw new BadRequestException('This coupon is only valid for first-time buyers');
    }

    const cart = await this.cartModel.findOne({
      customerId: new Types.ObjectId(customerId),
    });
    if (!cart || cart.items.length === 0)
      throw new BadRequestException('Your cart is empty');

    if (coupon.minOrderValue > 0 && cart.subTotal < coupon.minOrderValue)
      throw new BadRequestException(
        `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
      );

    if (coupon.maxOrderValue > 0 && cart.subTotal > coupon.maxOrderValue)
      throw new BadRequestException(
        `This coupon is valid only for orders up to ₹${coupon.maxOrderValue}`,
      );

    if (coupon.scope !== CouponScope.ALL) {
      const eligible = await this.checkScopeEligibility(coupon, customerId);
      if (!eligible)
        throw new BadRequestException(
          'This coupon is not applicable to the items in your cart',
        );
    }

    const discountAmount = this.computeDiscount(coupon, cart.subTotal);
    const finalTotal     = Math.max(0, cart.orderTotal - discountAmount);

    return { coupon, discountAmount, finalTotal };
  }

  async recordUsage(
    couponId:       string,
    customerId:     string,
    orderId:        string,
    discountGiven:  number,
    orderTotal:     number,
  ): Promise<void> {
    await Promise.all([
      this.usageModel.create({
        couponId:     new Types.ObjectId(couponId),
        customerId:   new Types.ObjectId(customerId),
        orderId:      new Types.ObjectId(orderId),
        discountGiven,
        orderTotal,
      }),
      this.couponModel.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } }),
    ]);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private computeDiscount(coupon: CouponDocument, subTotal: number): number {
    if (coupon.discountType === DiscountType.FREE_SHIP) return 0; // handled at shipping level
    if (coupon.discountType === DiscountType.FLAT) return Math.min(coupon.discountValue, subTotal);

    // Percentage
    let discount = Math.round((subTotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0)
      discount = Math.min(discount, coupon.maxDiscountAmount);
    return discount;
  }

  private async checkScopeEligibility(
    coupon: CouponDocument,
    customerId: string,
  ): Promise<boolean> {
    const cart = await this.cartModel.findOne({
      customerId: new Types.ObjectId(customerId),
    });
    if (!cart || !cart.items.length) return false;
    const cartProductIds = cart.items.map((i) => i.productId.toString());

    if (coupon.scope === CouponScope.PRODUCT) {
      const allowed = coupon.applicableProducts.map((p) => p.toString());
      return cartProductIds.some((id) => allowed.includes(id));
    }

    const { model } = this.cartModel.db;
    const ProductModel = model('Product');

    if (coupon.scope === CouponScope.CATEGORY) {
      const allowedCatIds = coupon.applicableCategories.map((c) => c.toString());
      const matchingProducts = await ProductModel.find({
        _id: { $in: cart.items.map((i) => i.productId) },
        categoryId: { $in: coupon.applicableCategories },
      }).select('_id').lean();
      return matchingProducts.length > 0;
    }

    if (coupon.scope === CouponScope.DEPARTMENT) {
      const matchingProducts = await ProductModel.find({
        _id: { $in: cart.items.map((i) => i.productId) },
        departmentId: { $in: coupon.applicableDepartments },
      }).select('_id').lean();
      return matchingProducts.length > 0;
    }

    return false;
  }
}