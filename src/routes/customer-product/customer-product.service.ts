import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../Product/schemas/product.schema';
import { CustomerProductFilterDto } from './dto/customer-product-filter.dto';
import { paginate, PaginatedResult, PaginationDto } from '../../common/pagination';

@Injectable()
export class CustomerProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}


  private baseQuery(): Record<string, any> {
    return {
      isDeleted: false,
      listingStatus: 'Active',
      'mainImage.url': { $exists: true, $ne: null },
    };
  }


  private customerProjection(): Record<string, 0> {
    return {
      isDeleted: 0,
      listingStatus: 0,
      procurementType: 0,
      procurementSla: 0,
      shippingProvider: 0,
      localHandlingFee: 0,
      zonalHandlingFee: 0,
      nationalHandlingFee: 0,
      minimumOrderQuantity: 0,
      hsn: 0,
      luxuryCess: 0,
      taxCode: 0,
      manufacturerDetails: 0,
      packerDetails: 0,
      importerDetails: 0,
      eanMeasuringUnit: 0,
    };
  }

  // 1. GET ALL PRODUCTS   ────────────────────────────────────────────

  async findAll(filters: CustomerProductFilterDto): Promise<PaginatedResult<ProductDocument>> {
    const {
      page, limit, search,
      sortBy = 'createdAt', sortOrder = 'desc',
      priceMin, priceMax, brand, idealFor, sleeveLength,
      pattern, fabric, topType, bottomType, additionalGarments,
      size, color, occasion, kurtaStyleType, neck, trend,
      sleeveStyle, topLength, dupattalIncluded, coOrdSet,
    } = filters;

    const query: Record<string, any> = this.baseQuery();

    // Price range
    if (priceMin !== undefined || priceMax !== undefined) {
      query.sellingPrice = {};
      if (priceMin !== undefined) query.sellingPrice.$gte = priceMin;
      if (priceMax !== undefined) query.sellingPrice.$lte = priceMax;
    }

    if (idealFor)           query.idealFor           = idealFor;
    if (sleeveLength)       query.sleeveLength       = sleeveLength;
    if (topType)            query.topType            = topType;
    if (bottomType)         query.bottomType         = bottomType;
    if (additionalGarments) query.additionalGarments = additionalGarments;
    if (size)               query.size               = size;
    if (kurtaStyleType)     query.kurtaStyleType     = kurtaStyleType;
    if (neck)               query.neck               = neck;
    if (sleeveStyle)        query.sleeveStyle        = sleeveStyle;
    if (topLength)          query.topLength          = topLength;

    if (brand) query.brand = { $regex: brand, $options: 'i' };

    if (pattern)  query.pattern  = { $in: [pattern] };
    if (fabric)   query.fabric   = { $in: [fabric] };
    if (color)    query.color    = { $in: [color] };
    if (occasion) query.occasion = { $in: [occasion] };
    if (trend)    query.trend    = { $in: [trend] };

    if (dupattalIncluded !== undefined) query.dupattalIncluded = dupattalIncluded;
    if (coOrdSet !== undefined)         query.coOrdSet         = coOrdSet;

    if (search) {
      const re = { $regex: search, $options: 'i' };
      query.$or = [
        { brand: re },
        { styleCode: re },
        { description: re },
        { searchKeywords: { $in: [new RegExp(search, 'i')] } },
        { keyFeatures:    { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const allowedSort = ['sellingPrice', 'mrp', 'createdAt'];
    const safeSortBy  = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const sort: Record<string, 1 | -1> = { [safeSortBy]: sortOrder === 'asc' ? 1 : -1 };

    const projectedModel = {
      countDocuments: (f: any) => this.productModel.countDocuments(f),
      find: (f: any) =>
        this.productModel.find(f, this.customerProjection()),
    };

    const pagination: PaginationDto = { page, limit };

    return paginate<ProductDocument>(projectedModel, query, pagination, sort);
  }

  // 2. GET SINGLE PRODUCT BY ID ────────────────────────────────────────────

  async findById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Product not found');
    const product = await this.productModel.findOne(
      { _id: new Types.ObjectId(id), ...this.baseQuery() },
      this.customerProjection(),
    );
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // 3. GET PRODUCT WITH ALL SIZE/COLOR VARIANTS (by groupId) ────────────────────────────────────────────

  async findWithVariants(id: string): Promise<{
    product: ProductDocument;
    variants: ProductDocument[];
  }> {
    const product = await this.findById(id);

    let variants: ProductDocument[] = [];

    if (product.groupId) {
      variants = await this.productModel
        .find(
          {
            groupId: product.groupId,
            _id: { $ne: product._id },
            ...this.baseQuery(),
          },
          this.customerProjection(),
        )
        .sort({ size: 1 })
        .exec();
    }

    return { product, variants };
  }

  // 4. GET ALL VARIANTS OF A GROUP (by groupId directly) ────────────────────────────────────────────

  async findByGroupId(groupId: string): Promise<ProductDocument[]> {
    const variants = await this.productModel
      .find(
        { groupId, ...this.baseQuery() },
        this.customerProjection(),
      )
      .sort({ size: 1 })
      .exec();

    if (!variants.length) throw new NotFoundException(`No active products found for group "${groupId}"`);
    return variants;
  }

  // 5. GET SIMILAR PRODUCTS (same topType + bottomType, different groupId) ────────────────────────────────────────────

  async findSimilar(id: string, limit = 8): Promise<ProductDocument[]> {
    const product = await this.findById(id);

    const query: Record<string, any> = {
      ...this.baseQuery(),
      topType:    product.topType,
      bottomType: product.bottomType,
      _id:        { $ne: product._id },
    };

    if (product.groupId) {
      query.groupId = { $ne: product.groupId };
    }

    return this.productModel
      .find(query, this.customerProjection())
      .limit(Math.min(limit, 20))
      .sort({ createdAt: -1 })
      .exec();
  }

  // 6. GET PRODUCTS BY OCCASION  ────────────────────────────────────────────

  async findByOccasion(
    occasion: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<ProductDocument>> {
    const query = { ...this.baseQuery(), occasion: { $in: [occasion] } };

    const projectedModel = {
      countDocuments: (f: any) => this.productModel.countDocuments(f),
      find: (f: any) =>
        this.productModel.find(f, this.customerProjection()),
    };

    return paginate<ProductDocument>(
      projectedModel,
      query,
      pagination,
      { createdAt: -1 },
    );
  }

  // 7. GET NEW ARRIVALS  ────────────────────────────────────────────

  async findNewArrivals(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<ProductDocument>> {
    const projectedModel = {
      countDocuments: (f: any) => this.productModel.countDocuments(f),
      find: (f: any) =>
        this.productModel.find(f, this.customerProjection()),
    };

    return paginate<ProductDocument>(
      projectedModel,
      this.baseQuery(),
      pagination,
      { createdAt: -1 },
    );
  }
}