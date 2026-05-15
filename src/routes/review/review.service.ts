import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Review,
  ReviewDocument,
  ReviewStatus,
} from './schemas/review.schema';
import {
  CreateReviewDto,
  CustomerReviewFilterDto,
  FilterReviewsDto,
  ModerateReviewDto,
  UpdateReviewDto,
} from './dto/review.dto';
import { Order, OrderDocument } from '../checkout/schemas/order.schema';
import { paginate, PaginatedResult, PaginationDto } from '../../common/pagination';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from '../../common/cloudinary'; 

export interface RatingSummary {
  average:      number;       
  total:        number;    
  breakdown: {                 
    5: number; 4: number; 3: number; 2: number; 1: number;
  };
}

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Order.name)
    private readonly orderModel:  Model<OrderDocument>,
  ) {}

  // ─── CUSTOMER: Submit review ──────────────────────────────────────────────

  async create(
    dto:          CreateReviewDto,
    customerId:   string,
    customerName: string,
    imageFiles:   Express.Multer.File[],
  ): Promise<ReviewDocument> {
    // One review per customer per product
    const existing = await this.reviewModel.findOne({
      productId:  new Types.ObjectId(dto.productId),
      customerId: new Types.ObjectId(customerId),
      isDeleted:  false,
    });
    if (existing)
      throw new BadRequestException('You have already reviewed this product');

    let isVerifiedPurchase = false;
    let orderId: Types.ObjectId | null = null;

    const verifiedOrder = await this.orderModel.findOne({
      customerId:  new Types.ObjectId(customerId),
      orderStatus: 'Delivered',
      'items.productId': new Types.ObjectId(dto.productId),
    });
    if (verifiedOrder) {
      isVerifiedPurchase = true;
      orderId = verifiedOrder._id as Types.ObjectId;
    }

    const images = await Promise.all(
      imageFiles.map(async (f) => {
        const res = await uploadToCloudinary(
          f.buffer,
          'reviews',
          f.originalname,
        );
        return { url: res.url, publicId: res.publicId };
      }),
    );

    const review = new this.reviewModel({
      productId:          new Types.ObjectId(dto.productId),
      variantId:          dto.variantId ? new Types.ObjectId(dto.variantId) : null,
      customerId:         new Types.ObjectId(customerId),
      customerName,
      isVerifiedPurchase,
      orderId,
      rating:             dto.rating,
      title:              dto.title,
      body:               dto.body,
      images,
      status:             ReviewStatus.PENDING,
    });

    return review.save();
  }

  // ─── CUSTOMER: Update own review ─────────────────────────────────────────

  async update(
    reviewId:   string,
    customerId: string,
    dto:        UpdateReviewDto,
    addImages:  Express.Multer.File[],
    removePublicIds: string[],
  ): Promise<ReviewDocument> {
    const review = await this.findOneOrFail(reviewId);
    if (review.customerId.toString() !== customerId)
      throw new ForbiddenException('You can only edit your own reviews');

    if (addImages.length) {
      const uploaded = await Promise.all(
        addImages.map(async (f) => {
          const res = await uploadToCloudinary(f.buffer, 'reviews', f.originalname);
          return { url: res.url, publicId: res.publicId };
        }),
      );
      const total = review.images.length + uploaded.length;
      if (total > 5) throw new BadRequestException('A review can have at most 5 images');
      review.images.push(...uploaded);
    }

    if (removePublicIds.length) {
      await Promise.all(
        removePublicIds.map((pid) => deleteFromCloudinary(pid).catch(() => {})),
      );
      review.images = review.images.filter(
        (img) => !removePublicIds.includes(img.publicId),
      );
    }

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.title  !== undefined) review.title  = dto.title;
    if (dto.body   !== undefined) review.body   = dto.body;

    review.status = ReviewStatus.PENDING;

    review.markModified('images');
    return review.save();
  }

  // ─── CUSTOMER: Delete own review ─────────────────────────────────────────

  async deleteOwn(reviewId: string, customerId: string): Promise<void> {
    const review = await this.findOneOrFail(reviewId);
    if (review.customerId.toString() !== customerId)
      throw new ForbiddenException('You can only delete your own reviews');
    review.isDeleted = true;
    await review.save();
  }

  // ─── CUSTOMER: Vote on a review ───────────────────────────────────────────

  async vote(
    reviewId: string,
    vote:     'helpful' | 'notHelpful',
  ): Promise<void> {
    const review = await this.findOneOrFail(reviewId);
    if (review.status !== ReviewStatus.APPROVED)
      throw new BadRequestException('Review is not available');

    if (vote === 'helpful') {
      review.helpfulCount += 1;
    } else {
      review.notHelpfulCount += 1;
    }
    await review.save();
  }

  // ─── CUSTOMER: Get approved reviews for a product ────────────────────────

  async findByProduct(
    productId: string,
    filters:   CustomerReviewFilterDto,
  ): Promise<{ reviews: PaginatedResult<ReviewDocument>; summary: RatingSummary }> {
    const baseQuery: Record<string, any> = {
      productId: new Types.ObjectId(productId),
      status:    ReviewStatus.APPROVED,
      isDeleted: false,
    };

    if (filters.rating) baseQuery.rating = filters.rating;
    if (filters.isVerifiedPurchase) baseQuery.isVerifiedPurchase = true;

    const allowedSort: Record<string, string> = {
      rating:       'rating',
      helpfulCount: 'helpfulCount',
      createdAt:    'createdAt',
    };
    const sortField = allowedSort[filters.sortBy ?? 'createdAt'] ?? 'createdAt';
    const sortDir: 1 | -1 = filters.sortOrder === 'asc' ? 1 : -1;

    const [reviews, summary] = await Promise.all([
      paginate<ReviewDocument>(
        this.reviewModel,
        baseQuery,
        { page: filters.page, limit: filters.limit },
        { [sortField]: sortDir },
      ),
      this.getRatingSummary(productId),
    ]);

    return { reviews, summary };
  }

  // ─── CUSTOMER: Get product rating summary only ────────────────────────────

  async getRatingSummary(productId: string): Promise<RatingSummary> {
    const agg = await this.reviewModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          status:    ReviewStatus.APPROVED,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id:     null,
          total:   { $sum: 1 },
          average: { $avg: '$rating' },
          star5:   { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          star4:   { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          star3:   { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          star2:   { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          star1:   { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
    ]);

    if (!agg.length) {
      return {
        average:   0,
        total:     0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const r = agg[0];
    return {
      average:   Math.round(r.average * 10) / 10,
      total:     r.total,
      breakdown: { 5: r.star5, 4: r.star4, 3: r.star3, 2: r.star2, 1: r.star1 },
    };
  }

  // ─── ADMIN: List reviews ──────────────────────────────────────────────────

  async findAll(
    pagination: PaginationDto,
    filters:    FilterReviewsDto,
  ): Promise<PaginatedResult<ReviewDocument>> {
    const query: Record<string, any> = { isDeleted: false };

    if (filters.productId) query.productId = new Types.ObjectId(filters.productId);
    if (filters.status)    query.status    = filters.status;
    if (filters.rating)    query.rating    = filters.rating;
    if (filters.isVerifiedPurchase) query.isVerifiedPurchase = true;

    const allowedSort: Record<string, string> = {
      rating:       'rating',
      helpfulCount: 'helpfulCount',
      createdAt:    'createdAt',
    };
    const sortField = allowedSort[filters.sortBy ?? 'createdAt'] ?? 'createdAt';
    const sortDir: 1 | -1 = filters.sortOrder === 'asc' ? 1 : -1;

    return paginate<ReviewDocument>(
      this.reviewModel,
      query,
      pagination,
      { [sortField]: sortDir },
    );
  }

  // ─── ADMIN: Moderate (approve / reject) ──────────────────────────────────

  async moderate(reviewId: string, dto: ModerateReviewDto): Promise<ReviewDocument> {
    const review = await this.findOneOrFail(reviewId);
    review.status          = dto.status;
    review.moderationNote  = dto.moderationNote ?? null;
    return review.save();
  }

  // ─── ADMIN: Hard delete ───────────────────────────────────────────────────

  async adminDelete(reviewId: string): Promise<void> {
    const review = await this.findOneOrFail(reviewId);

    await Promise.all(
      review.images.map((img) => deleteFromCloudinary(img.publicId).catch(() => {})),
    );

    review.isDeleted = true;
    await review.save();
  }


  private async findOneOrFail(reviewId: string): Promise<ReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId))
      throw new NotFoundException('Review not found');

    const review = await this.reviewModel.findOne({
      _id:       new Types.ObjectId(reviewId),
      isDeleted: false,
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }
}