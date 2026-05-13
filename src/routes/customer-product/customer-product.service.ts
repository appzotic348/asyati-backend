import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../Product/schemas/product.schema';
import { CustomerProductFilterDto } from './dto/customer-product-filter.dto';
import { paginate, PaginatedResult, PaginationDto } from '../../common/pagination';

export interface ProductCard {
  _id:            string;
  name:           string;
  styleCode?:     string;
  groupId?:       string;
  brand?:         { _id: string; name: string; logo?: string } | null;
  department?:    { _id: string; name: string } | null;
  category?:      { _id: string; name: string } | null;
  mainImage:      { url: string; publicId: string } | null;
  mainPaletteImage?: { url: string; publicId: string } | null;
  pricing: {
    mrp:          number;
    sellingPrice: number;
    discountPct:  number;
    currency:     string;
  };
  availableColors: string[];
  availableSizes:  string[];
  totalStock:      number;
  isFeatured:      boolean;
  metadata:        Array<{ key: string; value: string; type?: string }>;
  createdAt:       string;
}

export interface ProductDetail extends ProductCard {
  otherImages:      Array<{ type: string; url: string; publicId: string }>;
  description?:     string;
  shortDescription?: string;
  searchKeywords:   string[];
  keyFeatures:      string[];
  videoUrl?:        string;
  variants:         Array<{
    _id:        string;
    title:      string;
    sku:        string;
    barcode?:   string;
    color:      string;
    size:       string;
    hsn?:       string;
    status:     string;
    pricing: {
      mrp:          number;
      sellingPrice: number;
      discountPct:  number;
      currency:     string;
    };
    inventory: {
      stock:     number;
      available: number;
    };
    shipping?: {
      weightKg?:  number;
      lengthCm?:  number;
      breadthCm?: number;
      heightCm?:  number;
    };
  }>;
}

@Injectable()
export class CustomerProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  private baseQuery(): Record<string, any> {
    return {
      'flags.isDeleted': false,
      listingStatus: 'Active',
      'mainImage.url': { $exists: true, $ne: null },
    };
  }

  private customerProjection(): Record<string, 0> {
    return {
      'flags.isDeleted':             0,
      'flags.isBlocked':             0,
      'flags.isDraft':               0,
      listingStatus:                 0,
      minimumOrderQuantity:          0,
      'variants.pricing.costPrice':  0,
      'variants.inventory.reserved': 0,
      'variants.shipping':           0,
      totalReserved:                 0,
      'seo.metaTitle':               0,
      'seo.metaDescription':         0,
      'seo.metaKeywords':            0,
    };
  }

  private pickBasePricing(variants: any[]): {
    mrp: number; sellingPrice: number; discountPct: number; currency: string;
  } {
    if (!variants?.length) return { mrp: 0, sellingPrice: 0, discountPct: 0, currency: 'INR' };
    const active = variants.filter(v => v.status !== 'INACTIVE' && v.inventory?.available > 0);
    const pool   = active.length ? active : variants;
    const best   = pool.reduce((prev, cur) =>
      cur.pricing.sellingPrice < prev.pricing.sellingPrice ? cur : prev, pool[0]);
    const mrp    = best.pricing.mrp;
    const sp     = best.pricing.sellingPrice;
    return {
      mrp,
      sellingPrice: sp,
      discountPct:  mrp > 0 ? Math.round(((mrp - sp) / mrp) * 100) : 0,
      currency:     best.pricing.currency ?? 'INR',
    };
  }

  /** Map a raw Mongoose doc → lightweight ProductCard for list views */
  private toCard(doc: any): ProductCard {
    const variants: any[] = doc.variants ?? [];
    return {
      _id:              String(doc._id),
      name:             doc.name,
      styleCode:        doc.styleCode,
      groupId:          doc.groupId,
      brand:            doc.brandId
        ? { _id: String(doc.brandId._id ?? doc.brandId), name: doc.brandId.name ?? '', logo: doc.brandId.logo }
        : null,
      department:       doc.departmentId
        ? { _id: String(doc.departmentId._id ?? doc.departmentId), name: doc.departmentId.name ?? '' }
        : null,
      category:         doc.categoryId
        ? { _id: String(doc.categoryId._id ?? doc.categoryId), name: doc.categoryId.name ?? '' }
        : null,
      mainImage:        doc.mainImage ?? null,
      mainPaletteImage: doc.mainPaletteImage ?? null,
      pricing:          this.pickBasePricing(variants),
      availableColors:  [...new Set(variants.map((v: any) => v.color).filter(Boolean))] as string[],
      availableSizes:   [...new Set(variants.map((v: any) => v.size).filter(Boolean))]  as string[],
      totalStock:       doc.availableStock ?? 0,
      isFeatured:       doc.visibility?.isFeatured ?? false,
      metadata:         doc.metadata ?? [],
      createdAt:        doc.createdAt,
    };
  }

  /** Map a raw doc → full ProductDetail for the detail page */
  private toDetail(doc: any): ProductDetail {
    const card     = this.toCard(doc);
    const variants = (doc.variants ?? []).map((v: any) => ({
      _id:      String(v._id),
      title:    v.title,
      sku:      v.sku,
      barcode:  v.barcode,
      color:    v.color,
      size:     v.size,
      hsn:      v.hsn,
      status:   v.status,
      pricing: {
        mrp:          v.pricing.mrp,
        sellingPrice: v.pricing.sellingPrice,
        discountPct:  v.pricing.mrp > 0
          ? Math.round(((v.pricing.mrp - v.pricing.sellingPrice) / v.pricing.mrp) * 100)
          : 0,
        currency:     v.pricing.currency ?? 'INR',
      },
      inventory: {
        stock:     v.inventory?.stock     ?? 0,
        available: v.inventory?.available ?? 0,
      },
      shipping: v.shipping,
    }));

    return {
      ...card,
      otherImages:       doc.otherImages      ?? [],
      description:       doc.description,
      shortDescription:  doc.shortDescription,
      searchKeywords:    doc.searchKeywords    ?? [],
      keyFeatures:       doc.keyFeatures       ?? [],
      videoUrl:          doc.videoUrl,
      variants,
    };
  }

  private applyMetadataFilter(
    rawMetadata: string | undefined,
    query: Record<string, any>,
  ): void {
    if (!rawMetadata?.trim()) return;

    const pairs = rawMetadata
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const colonIdx = s.indexOf(':');
        if (colonIdx === -1) return null;
        return { key: s.slice(0, colonIdx).trim(), value: s.slice(colonIdx + 1).trim() };
      })
      .filter(Boolean) as Array<{ key: string; value: string }>;

    if (!pairs.length) return;

    query.metadata = query.metadata ?? { $all: [] };
    if (!query.metadata.$all) query.metadata.$all = [];

    for (const { key, value } of pairs) {
      (query.metadata.$all as any[]).push({
        $elemMatch: { key, value: { $regex: new RegExp(`^${value}$`, 'i') } },
      });
    }
  }

  // ─── 1. GET ALL ──────────────────────────────────────────────────────────

  async findAll(filters: CustomerProductFilterDto): Promise<PaginatedResult<ProductCard>> {
    const {
      page, limit, search,
      sortBy = 'createdAt', sortOrder = 'desc',
      priceMin, priceMax,
      brand, size, color,
      metadata: rawMetadata,
      departmentId, categoryId,
    } = filters;

    const query: Record<string, any> = this.baseQuery();

    if (departmentId) query.departmentId = new Types.ObjectId(departmentId);
    if (categoryId)   query.categoryId   = new Types.ObjectId(categoryId);

    if (priceMin !== undefined || priceMax !== undefined) {
      query['variants.pricing.sellingPrice'] = {};
      if (priceMin !== undefined) query['variants.pricing.sellingPrice'].$gte = priceMin;
      if (priceMax !== undefined) query['variants.pricing.sellingPrice'].$lte = priceMax;
    }

    if (size)  query['variants.size']  = size;
    if (color) query['variants.color'] = { $regex: new RegExp(`^${color}$`, 'i') };

    this.applyMetadataFilter(rawMetadata, query);

    if (brand) {
      const brandClauses = [
        { searchKeywords: { $in: [new RegExp(brand, 'i')] } },
        { name: { $regex: brand, $options: 'i' } },
      ];
      query.$or ? (query.$and = [{ $or: query.$or }, { $or: brandClauses }], delete query.$or)
                : (query.$or = brandClauses);
    }

    if (search) {
      const re            = { $regex: search, $options: 'i' };
      const searchClauses = [
        { name: re },
        { styleCode: re },
        { description: re },
        { searchKeywords: { $in: [new RegExp(search, 'i')] } },
        { keyFeatures:    { $in: [new RegExp(search, 'i')] } },
        { sellerSkuId: re },
      ];
      if (query.$and)      query.$and.push({ $or: searchClauses });
      else if (query.$or) (query.$and = [{ $or: query.$or }, { $or: searchClauses }], delete query.$or);
      else                 query.$or = searchClauses;
    }

    const allowedSort: Record<string, string> = {
      sellingPrice: 'variants.pricing.sellingPrice',
      mrp:          'variants.pricing.mrp',
      createdAt:    'createdAt',
    };
    const sort: Record<string, 1 | -1> = {
      [allowedSort[sortBy] ?? 'createdAt']: sortOrder === 'asc' ? 1 : -1,
    };

    const projectedModel = {
      countDocuments: (f: any) => this.productModel.countDocuments(f),
      find: (f: any) =>
        this.productModel
          .find(f, this.customerProjection())
          .populate('departmentId', 'name')
          .populate('categoryId',   'name')
          .populate('brandId',      'name logo'),
    };

    const raw = await paginate<ProductDocument>(projectedModel, query, { page, limit }, sort);
    return {
      data: raw.data.map(d => this.toCard(d)),
      meta: raw.meta,
    };
  }

  // ─── 2. FIND BY ID  ───────────────────────────────

  async findById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Product not found');

    const product = await this.productModel
      .findOne(
        { _id: new Types.ObjectId(id), ...this.baseQuery() },
        this.customerProjection(),
      )
      .populate('departmentId', 'name')
      .populate('categoryId',   'name')
      .populate('brandId',      'name logo');

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─── 3. DETAIL + GROUP VARIANTS ─────────────────────────────────────────

  async findWithVariants(id: string): Promise<{
    product:  ProductDetail;
    variants: ProductCard[];
  }> {
    const doc = await this.findById(id);

    let siblingDocs: ProductDocument[] = [];
    if ((doc as any).groupId) {
      siblingDocs = await this.productModel
        .find(
          { groupId: (doc as any).groupId, _id: { $ne: doc._id }, ...this.baseQuery() },
          this.customerProjection(),
        )
        .populate('brandId', 'name logo')
        .sort({ name: 1 })
        .exec();
    }

    return {
      product:  this.toDetail(doc),
      variants: siblingDocs.map(d => this.toCard(d)),
    };
  }

  // ─── 4. ALL VARIANTS OF A GROUP ─────────────────────────────────────────

  async findByGroupId(groupId: string): Promise<ProductCard[]> {
    const docs = await this.productModel
      .find({ groupId, ...this.baseQuery() }, this.customerProjection())
      .populate('brandId', 'name logo')
      .sort({ name: 1 })
      .exec();

    if (!docs.length)
      throw new NotFoundException(`No active products found for group "${groupId}"`);

    return docs.map(d => this.toCard(d));
  }

  // ─── 5. SIMILAR PRODUCTS ────────────────────────────────────────────────

  async findSimilar(id: string, limit = 8): Promise<ProductCard[]> {
    const doc = await this.findById(id);

    const query: Record<string, any> = {
      ...this.baseQuery(),
      departmentId: (doc as any).departmentId,
      categoryId:   (doc as any).categoryId,
      _id:          { $ne: doc._id },
    };

    if ((doc as any).groupId) query.groupId = { $ne: (doc as any).groupId };

    const topMeta    = (doc as any).metadata?.find((m: any) => m.key === 'Top Type');
    const bottomMeta = (doc as any).metadata?.find((m: any) => m.key === 'Bottom Type');
    if (topMeta || bottomMeta) {
      const cond: any[] = [];
      if (topMeta)    cond.push({ $elemMatch: { key: 'Top Type',    value: topMeta.value } });
      if (bottomMeta) cond.push({ $elemMatch: { key: 'Bottom Type', value: bottomMeta.value } });
      query.metadata = { $all: cond };
    }

    const docs = await this.productModel
      .find(query, this.customerProjection())
      .populate('brandId', 'name logo')
      .limit(Math.min(limit, 20))
      .sort({ createdAt: -1 })
      .exec();

    return docs.map(d => this.toCard(d));
  }

  // ─── 6. BY OCCASION ─────────────────────────────────────────────────────

  async findByOccasion(
    occasion: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<ProductCard>> {
    const query = {
      ...this.baseQuery(),
      metadata: {
        $elemMatch: { key: 'Occasion', value: { $regex: new RegExp(occasion, 'i') } },
      },
    };

    const projectedModel = {
      countDocuments: (f: any) => this.productModel.countDocuments(f),
      find: (f: any) =>
        this.productModel
          .find(f, this.customerProjection())
          .populate('brandId', 'name logo')
          .populate('departmentId', 'name')
          .populate('categoryId',   'name'),
    };

    const raw = await paginate<ProductDocument>(projectedModel, query, pagination, { createdAt: -1 });
    return { data: raw.data.map(d => this.toCard(d)), meta: raw.meta };
  }

  // ─── 7. NEW ARRIVALS ─────────────────────────────────────────────────────

  async findNewArrivals(pagination: PaginationDto): Promise<PaginatedResult<ProductCard>> {
    const projectedModel = {
      countDocuments: (f: any) => this.productModel.countDocuments(f),
      find: (f: any) =>
        this.productModel
          .find(f, this.customerProjection())
          .populate('brandId', 'name logo')
          .populate('departmentId', 'name')
          .populate('categoryId',   'name'),
    };

    const raw = await paginate<ProductDocument>(
      projectedModel, this.baseQuery(), pagination, { createdAt: -1 },
    );
    return { data: raw.data.map(d => this.toCard(d)), meta: raw.meta };
  }

  // ─── 8. FEATURED ────────────────────────────────────────────────────────

  async findFeatured(pagination: PaginationDto): Promise<PaginatedResult<ProductCard>> {
    const query = { ...this.baseQuery(), 'visibility.isFeatured': true };

    const projectedModel = {
      countDocuments: (f: any) => this.productModel.countDocuments(f),
      find: (f: any) =>
        this.productModel
          .find(f, this.customerProjection())
          .populate('brandId', 'name logo')
          .populate('departmentId', 'name')
          .populate('categoryId',   'name'),
    };

    const raw = await paginate<ProductDocument>(projectedModel, query, pagination, { createdAt: -1 });
    return { data: raw.data.map(d => this.toCard(d)), meta: raw.meta };
  }
}