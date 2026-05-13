import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inventory, InventoryDocument } from './schemas/inventory.schema';
import { InventoryFilterDto } from './dto/inventory.dto';
import { paginate, PaginatedResult } from '../../common/pagination';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
  ) {}

  // ── Upsert a single variant inventory record ──────────────────────────────

  async upsertVariantInventory(
    productId:    string,
    variantId:    string,
    productName:  string,
    sellerSkuId:  string,
    size:         string,
    color:        string,
    stock:        number,
    variantTitle?: string,
    variantSku?:   string,
  ): Promise<InventoryDocument> {
    return this.inventoryModel.findOneAndUpdate(
      {
        productId: new Types.ObjectId(productId),
        variantId: new Types.ObjectId(variantId),
      },
      {
        $set: {
          productId:    new Types.ObjectId(productId),
          variantId:    new Types.ObjectId(variantId),
          productName,
          sellerSkuId,
          size,
          color,
          stock,
          variantTitle,
          variantSku,
        },
        $setOnInsert: { reserved: 0 },
      },
      { new: true, upsert: true },
    );
  }

  // ── Set / replace ALL variant inventory records for a product ─────────────
  async setInventoryForProduct(
    productId:   string,
    productName: string,
    sellerSkuId: string,
    variants: Array<{
      variantId: string;
      size: string;
      color: string;
      stock: number;
      variantTitle?: string;
      variantSku?: string;
    }>,
  ): Promise<InventoryDocument[]> {
    await this.inventoryModel.deleteMany({
      productId: new Types.ObjectId(productId),
    });

    if (!variants.length) return [];

    const docs = variants.map(v => ({
      productId:    new Types.ObjectId(productId),
      variantId:    new Types.ObjectId(v.variantId),
      productName,
      sellerSkuId,
      size:         v.size,
      color:        v.color,
      stock:        v.stock ?? 0,
      reserved:     0,
      variantTitle: v.variantTitle,
      variantSku:   v.variantSku,
    }));

    return this.inventoryModel.insertMany(docs) as unknown as InventoryDocument[];
  }

  // ── Update stock for one variant ──────────────────────────────────────────
  async updateVariantStock(
    productId: string,
    variantId: string,
    stock:     number,
  ): Promise<InventoryDocument> {
    const inv = await this.inventoryModel.findOneAndUpdate(
      {
        productId: new Types.ObjectId(productId),
        variantId: new Types.ObjectId(variantId),
      },
      { $set: { stock } },
      { new: true },
    );
    if (!inv)
      throw new NotFoundException('Inventory record not found for this variant');
    return inv;
  }

  // ── Reserve stock ────────────────────────────────────────
  async reserveStock(
    productId: string,
    variantId: string,
    qty:       number,
  ): Promise<void> {
    const inv = await this.inventoryModel.findOne({
      productId: new Types.ObjectId(productId),
      variantId: new Types.ObjectId(variantId),
    });
    if (!inv)
      throw new BadRequestException('Inventory not found for this variant');

    const available = inv.stock - (inv.reserved ?? 0);
    if (available < qty)
      throw new BadRequestException(
        `Insufficient stock for variant. Available: ${available}`,
      );

    inv.reserved = (inv.reserved ?? 0) + qty;
    await inv.save();
  }

  // ── Release reserved stock ────────────────────────────────────────────────
  async releaseStock(
    productId: string,
    variantId: string,
    qty:       number,
  ): Promise<void> {
    const inv = await this.inventoryModel.findOne({
      productId: new Types.ObjectId(productId),
      variantId: new Types.ObjectId(variantId),
    });
    if (!inv) return;
    inv.reserved = Math.max(0, (inv.reserved ?? 0) - qty);
    await inv.save();
  }

  // ── Confirm sale ──────────────────────────────────────────────────────────
  async confirmSale(
    productId: string,
    variantId: string,
    qty:       number,
  ): Promise<void> {
    const inv = await this.inventoryModel.findOne({
      productId: new Types.ObjectId(productId),
      variantId: new Types.ObjectId(variantId),
    });
    if (!inv) return;
    inv.stock    = Math.max(0, inv.stock - qty);
    inv.reserved = Math.max(0, (inv.reserved ?? 0) - qty);
    await inv.save();
  }

  // ── Delete inventory for a single variant ─────────────────────────────────
  async deleteVariantInventory(productId: string, variantId: string): Promise<void> {
    await this.inventoryModel.deleteOne({
      productId: new Types.ObjectId(productId),
      variantId: new Types.ObjectId(variantId),
    });
  }

  // ── Get all inventory records for a product ───────────────────────────────
  async findByProductId(productId: string): Promise<InventoryDocument[]> {
    if (!Types.ObjectId.isValid(productId))
      throw new NotFoundException('Invalid productId');
    return this.inventoryModel.find({
      productId: new Types.ObjectId(productId),
    }).sort({ size: 1, color: 1 });
  }

  // ── Get one variant's inventory ───────────────────────────────────────────
  async findByVariantId(
    productId: string,
    variantId: string,
  ): Promise<InventoryDocument> {
    const inv = await this.inventoryModel.findOne({
      productId: new Types.ObjectId(productId),
      variantId: new Types.ObjectId(variantId),
    });
    if (!inv)
      throw new NotFoundException('Inventory not found for this variant');
    return inv;
  }

  // ── Get all inventory  ───────────────────────────
  async findAll(filters: InventoryFilterDto): Promise<PaginatedResult<InventoryDocument>> {
    const query: Record<string, any> = {};

    if (filters.productId)
      query.productId = new Types.ObjectId(filters.productId);

    if (filters.search)
      query.$or = [
        { sellerSkuId:  { $regex: filters.search, $options: 'i' } },
        { productName:  { $regex: filters.search, $options: 'i' } },
        { variantTitle: { $regex: filters.search, $options: 'i' } },
      ];

    if (filters.lowStock)
      query.stock = { $lt: 10 };

    return paginate<InventoryDocument>(
      this.inventoryModel, query,
      { page: filters.page, limit: filters.limit },
      { stock: 1 },
    );
  }
}