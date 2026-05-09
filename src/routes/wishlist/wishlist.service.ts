import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument, WishlistItem } from './schemas/wishlist.schema';
import { Product, ProductDocument } from '../Product/schemas/product.schema';
import {
  AddToWishlistDto,
  GuestAddToWishlistDto,
  GuestWishlistFilterDto,
  MergeWishlistDto,
  WishlistFilterDto,
} from './dto/wishlist.dto';
import { PaginatedResult } from '../../common/pagination';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name)
    private readonly wishlistModel: Model<WishlistDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getOrCreateWishlist(
    customerId?: string,
    guestId?:    string,
  ): Promise<WishlistDocument> {
    const query = customerId
      ? { customerId: new Types.ObjectId(customerId) }
      : { guestId };

    let wishlist = await this.wishlistModel.findOne(query);
    if (!wishlist) {
      wishlist = new this.wishlistModel({
        customerId: customerId ? new Types.ObjectId(customerId) : null,
        guestId:    customerId ? null : guestId,
        items:      [],
        itemCount:  0,
        expiresAt:  customerId
          ? null
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await wishlist.save();
    }
    return wishlist;
  }

  private buildItem(product: ProductDocument): WishlistItem {
    return {
      productId:    product._id as Types.ObjectId,
      productName:  `${product.brand} — ${product.styleCode}`,
      sellerSkuId:  product.sellerSkuId,
      mrp:          product.mrp,
      sellingPrice: product.sellingPrice,
      discount:     product.mrp - product.sellingPrice,
      size:         product.size,
      color:        product.color,
      mainImageUrl: product.mainImage?.url ?? '',
      brand:        product.brand,
      isAvailable:  product.listingStatus === 'Active' && product.stock > 0,
      addedAt:      new Date(),
    };
  }

  private recalcCount(wishlist: WishlistDocument): void {
    wishlist.itemCount = wishlist.items.length;
  }

  private paginateItems(
    items: WishlistItem[],
    page?:  number,
    limit?: number,
  ): PaginatedResult<WishlistItem> {
    const total = items.length;

    if (!page && !limit) {
      return {
        data: items,
        meta: {
          total,
          totalPages:      null,
          currentPage:     null,
          perPage:         null,
          hasPreviousPage: null,
          hasNextPage:     null,
        },
      };
    }

    const safePage   = page  ?? 1;
    const safeLimit  = limit ?? 10;
    const skip       = (safePage - 1) * safeLimit;
    const totalPages = Math.ceil(total / safeLimit);

    return {
      data: items.slice(skip, skip + safeLimit),
      meta: {
        total,
        totalPages,
        currentPage:     safePage,
        perPage:         safeLimit,
        hasPreviousPage: safePage > 1,
        hasNextPage:     safePage < totalPages,
      },
    };
  }

  private async refreshAvailability(wishlist: WishlistDocument): Promise<void> {
    if (wishlist.items.length === 0) return;

    const productIds    = wishlist.items.map((i) => i.productId);
    const activeProducts = await this.productModel
      .find({
        _id:           { $in: productIds },
        isDeleted:     false,
        listingStatus: 'Active',
        stock:         { $gt: 0 },
      })
      .select('_id')
      .lean();

    const activeSet = new Set(activeProducts.map((p) => p._id.toString()));
    let modified = false;

    for (const item of wishlist.items) {
      const available = activeSet.has(item.productId.toString());
      if (item.isAvailable !== available) {
        item.isAvailable = available;
        modified = true;
      }
    }

    if (modified) {
      wishlist.markModified('items');
      await wishlist.save();
    }
  }

  async getWishlistAuth(
    customerId: string,
    filters:    WishlistFilterDto,
  ): Promise<PaginatedResult<WishlistItem>> {
    const wishlist = await this.getOrCreateWishlist(customerId);
    await this.refreshAvailability(wishlist);
    return this.paginateItems(
      wishlist.items as unknown as WishlistItem[],
      filters.page,
      filters.limit,
    );
  }

  async getWishlistGuest(
    guestId: string,
    filters: GuestWishlistFilterDto,
  ): Promise<PaginatedResult<WishlistItem>> {
    if (!guestId)
      throw new BadRequestException('guestId is required');

    const wishlist = await this.getOrCreateWishlist(undefined, guestId);
    await this.refreshAvailability(wishlist);
    return this.paginateItems(
      wishlist.items as unknown as WishlistItem[],
      filters.page,
      filters.limit,
    );
  }

  async addItemAuth(
    customerId: string,
    dto:        AddToWishlistDto,
  ): Promise<WishlistDocument> {
    const product = await this.productModel.findOne({
      _id:       new Types.ObjectId(dto.productId),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');

    const wishlist = await this.getOrCreateWishlist(customerId);

    // Idempotent — silently skip if already wishlisted
    const exists = wishlist.items.some(
      (i) => i.productId.toString() === dto.productId,
    );
    if (exists) return wishlist;

    wishlist.items.push(this.buildItem(product));
    this.recalcCount(wishlist);
    wishlist.markModified('items');
    return wishlist.save();
  }


  async addItemGuest(dto: GuestAddToWishlistDto): Promise<WishlistDocument> {
    if (!dto.guestId)
      throw new BadRequestException('guestId is required');

    const product = await this.productModel.findOne({
      _id:       new Types.ObjectId(dto.productId),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');

    const wishlist = await this.getOrCreateWishlist(undefined, dto.guestId);

    const exists = wishlist.items.some(
      (i) => i.productId.toString() === dto.productId,
    );
    if (exists) return wishlist;

    wishlist.items.push(this.buildItem(product));
    this.recalcCount(wishlist);
    wishlist.markModified('items');
    return wishlist.save();
  }

  async removeItemAuth(
    customerId: string,
    productId:  string,
  ): Promise<WishlistDocument> {
    const wishlist = await this.getOrCreateWishlist(customerId);
    const idx = wishlist.items.findIndex(
      (i) => i.productId.toString() === productId,
    );
    if (idx < 0) throw new NotFoundException('Item not found in wishlist');

    wishlist.items.splice(idx, 1);
    this.recalcCount(wishlist);
    wishlist.markModified('items');
    return wishlist.save();
  }

  async removeItemGuest(
    guestId:   string,
    productId: string,
  ): Promise<WishlistDocument> {
    if (!guestId)
      throw new BadRequestException('guestId is required');

    const wishlist = await this.getOrCreateWishlist(undefined, guestId);
    const idx = wishlist.items.findIndex(
      (i) => i.productId.toString() === productId,
    );
    if (idx < 0) throw new NotFoundException('Item not found in wishlist');

    wishlist.items.splice(idx, 1);
    this.recalcCount(wishlist);
    wishlist.markModified('items');
    return wishlist.save();
  }


  async clearWishlistAuth(customerId: string): Promise<void> {
    const wishlist = await this.wishlistModel.findOne({
      customerId: new Types.ObjectId(customerId),
    });
    if (!wishlist || wishlist.items.length === 0) return;

    wishlist.items     = [];
    wishlist.itemCount = 0;
    await wishlist.save();
  }

  async clearWishlistGuest(guestId: string): Promise<void> {
    if (!guestId) throw new BadRequestException('guestId is required');

    const wishlist = await this.wishlistModel.findOne({ guestId });
    if (!wishlist || wishlist.items.length === 0) return;

    wishlist.items     = [];
    wishlist.itemCount = 0;
    await wishlist.save();
  }

  async isWishlistedAuth(customerId: string, productId: string): Promise<boolean> {
    const wishlist = await this.wishlistModel.findOne({
      customerId: new Types.ObjectId(customerId),
    });
    if (!wishlist) return false;
    return wishlist.items.some((i) => i.productId.toString() === productId);
  }

  async isWishlistedGuest(guestId: string, productId: string): Promise<boolean> {
    if (!guestId) throw new BadRequestException('guestId is required');
    const wishlist = await this.wishlistModel.findOne({ guestId });
    if (!wishlist) return false;
    return wishlist.items.some((i) => i.productId.toString() === productId);
  }


  async mergeGuestWishlist(
    customerId: string,
    dto:        MergeWishlistDto,
  ): Promise<WishlistDocument> {
    const [guestWishlist, customerWishlist] = await Promise.all([
      this.wishlistModel.findOne({ guestId: dto.guestId }),
      this.getOrCreateWishlist(customerId),
    ]);

    if (!guestWishlist || guestWishlist.items.length === 0)
      return customerWishlist;

    for (const guestItem of guestWishlist.items) {
      const alreadyExists = customerWishlist.items.some(
        (i) => i.productId.toString() === guestItem.productId.toString(),
      );
      if (!alreadyExists) {
        customerWishlist.items.push({ ...guestItem });
      }
    }

    this.recalcCount(customerWishlist);
    customerWishlist.markModified('items');
    await customerWishlist.save();

    await this.wishlistModel.deleteOne({ _id: guestWishlist._id });

    return customerWishlist;
  }
}