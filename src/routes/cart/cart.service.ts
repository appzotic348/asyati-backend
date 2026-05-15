import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument, CartItem } from './schemas/cart.schema';
import { AddToCartDto, MergeCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { Product, ProductDocument } from '../Product/schemas/product.schema';
import { InventoryService } from '../inventory/inventory.service';
import { ShippingConfigService } from '../shipping-config/shipping-config.service';
import { computeTotals } from '../../common/utils/order-totals.util';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly inventoryService: InventoryService,
    private readonly shippingConfigService: ShippingConfigService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async getOrCreateCart(
    customerId?: string,
    guestId?: string,
  ): Promise<CartDocument> {
    const query = customerId
      ? { customerId: new Types.ObjectId(customerId) }
      : { guestId };

    let cart = await this.cartModel.findOne(query);
    if (!cart) {
      cart = new this.cartModel({
        customerId: customerId ? new Types.ObjectId(customerId) : null,
        guestId:    customerId ? null : guestId,
        items:      [],
        expiresAt:  customerId
          ? null
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await cart.save();
    }
    return cart;
  }

  private async resolveProductVariant(
    productId: string,
    variantId: string,
  ): Promise<{ product: ProductDocument; variant: any }> {
    if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(variantId))
      throw new NotFoundException('Product or variant not found');

    const product = await this.productModel
      .findOne({
        _id:              new Types.ObjectId(productId),
        'flags.isDeleted': false,
        listingStatus:    'Active',
      })
      .populate('taxGuideId', 'taxRate');

    if (!product)
      throw new NotFoundException('Product not found or not available');

    const variant = (product.variants as any[]).find(
      (v) => v._id.toString() === variantId,
    );
    if (!variant)
      throw new NotFoundException('Variant not found on this product');

    if (variant.status === 'INACTIVE')
      throw new BadRequestException('This variant is currently unavailable');

    return { product, variant };
  }

  private resolveTaxRate(product: ProductDocument): number {
    const guide = (product as any).taxGuideId;
    if (!guide) return 0;
    if (typeof guide.taxRate !== 'number') return 0;
    return guide.taxRate / 100;
  }

  private buildItem(
    product: ProductDocument,
    variant: any,
    quantity: number,
    availableStock: number,
    taxRate: number,
  ): CartItem {
    const mrp          = variant.pricing.mrp         as number;
    const sellingPrice = variant.pricing.sellingPrice as number;
    const discount     = mrp - sellingPrice;
    const discountPct  = mrp > 0 ? Math.round((discount / mrp) * 100) : 0;
    const itemTax = Math.round(sellingPrice * quantity * taxRate * 100) / 100;

    return {
      productId:           product._id as Types.ObjectId,
      variantId:           variant._id  as Types.ObjectId,
      quantity,
      priceAtAdd:          sellingPrice,
      mrpAtAdd:            mrp,
      discountAtAdd:       discount,
      discountPctAtAdd:    discountPct,
      currency:            variant.pricing.currency ?? 'INR',
      taxRate,
      itemTax,                            
      productName:         product.name,
      sellerSkuId:         product.sellerSkuId,
      variantSku:          variant.sku   ?? '',
      variantTitle:        variant.title ?? `${variant.color} / ${variant.size}`,
      size:                variant.size,
      color:               variant.color,
      mainImageUrl:        (product.mainImage as any)?.url ?? '',
      availableStockAtAdd: availableStock,
      addedAt:             new Date(),
      itemMrpTotal:        mrp          * quantity,
      itemSellingTotal:    sellingPrice * quantity,
      itemDiscountTotal:   discount     * quantity,
    };
  }

  private async recalcTotals(cart: CartDocument): Promise<void> {
    for (const item of cart.items) {
      item.itemMrpTotal      = item.mrpAtAdd      * item.quantity;
      item.itemSellingTotal  = item.priceAtAdd    * item.quantity;
      item.itemDiscountTotal = item.discountAtAdd * item.quantity;

      item.itemTax = Math.round(
        item.priceAtAdd * item.quantity * (item.taxRate ?? 0) * 100,
      ) / 100;
    }

    const shippingConfig = await this.shippingConfigService.getConfig();
    const totals         = computeTotals(cart.items, shippingConfig);

    cart.mrpTotal        = totals.mrpTotal;
    cart.subTotal        = totals.subTotal;
    cart.totalDiscount   = totals.totalDiscount;
    cart.discountPercent = totals.discountPercent;
    cart.shippingCharge  = totals.shippingCharge;
    cart.platformFee     = totals.platformFee;
    cart.tax             = totals.tax;       
    cart.orderTotal      = totals.orderTotal;
    cart.itemCount       = cart.items.length;
    cart.totalQuantity   = cart.items.reduce((s, i) => s + i.quantity, 0);
  }

  private findItemIndex(
    cart: CartDocument,
    productId: string,
    variantId: string,
  ): number {
    return cart.items.findIndex(
      (i) =>
        i.productId.toString() === productId &&
        i.variantId.toString() === variantId,
    );
  }

  // ─── GET CART ─────────────────────────────────────────────────────────────

  async getCart(customerId?: string, guestId?: string): Promise<CartDocument> {
    if (!customerId && !guestId)
      throw new BadRequestException(
        'Send a Bearer token (logged-in) or guestId (guest)',
      );
    return this.getOrCreateCart(customerId, guestId);
  }

  // ─── ADD ITEM ─────────────────────────────────────────────────────────────

  async addItem(dto: AddToCartDto, customerId?: string): Promise<CartDocument> {
    const guestId = customerId ? undefined : dto.guestId;
    if (!customerId && !guestId)
      throw new BadRequestException(
        'Send a Bearer token (logged-in) or guestId (guest)',
      );

    const { product, variant } = await this.resolveProductVariant(
      dto.productId,
      dto.variantId,
    );

    await this.inventoryService.reserveStock(
      dto.productId,
      dto.variantId,
      dto.quantity,
    );

    const invRecord = await this.inventoryService
      .findByVariantId(dto.productId, dto.variantId)
      .catch(() => null);
    const availableStock = invRecord
      ? invRecord.stock - (invRecord.reserved ?? 0)
      : 0;

    const taxRate = this.resolveTaxRate(product);

    const cart = await this.getOrCreateCart(customerId, guestId);
    const idx  = this.findItemIndex(cart, dto.productId, dto.variantId);

    if (idx >= 0) {
      cart.items[idx].quantity          += dto.quantity;
      cart.items[idx].availableStockAtAdd = availableStock;
      cart.items[idx].taxRate             = taxRate;
    } else {
      cart.items.push(
        this.buildItem(product, variant, dto.quantity, availableStock, taxRate),
      );
    }

    await this.recalcTotals(cart);
    cart.markModified('items');
    return cart.save();
  }

  // ─── UPDATE ITEM ──────────────────────────────────────────────────────────

  async updateItem(
    productId: string,
    variantId: string,
    dto: UpdateCartItemDto,
    customerId?: string,
  ): Promise<CartDocument> {
    const guestId = customerId ? undefined : dto.guestId;
    if (!customerId && !guestId)
      throw new BadRequestException(
        'Send a Bearer token (logged-in) or guestId (guest)',
      );

    const cart = await this.getOrCreateCart(customerId, guestId);
    const idx  = this.findItemIndex(cart, productId, variantId);
    if (idx < 0) throw new NotFoundException('Item not found in cart');

    const oldQty = cart.items[idx].quantity;
    const newQty = dto.quantity;
    const delta  = newQty - oldQty;

    if (newQty === 0) {
      await this.inventoryService.releaseStock(productId, variantId, oldQty);
      cart.items.splice(idx, 1);
    } else if (delta > 0) {
      await this.inventoryService.reserveStock(productId, variantId, delta);
      cart.items[idx].quantity = newQty;
    } else if (delta < 0) {
      await this.inventoryService.releaseStock(productId, variantId, Math.abs(delta));
      cart.items[idx].quantity = newQty;
    }

    await this.recalcTotals(cart);
    cart.markModified('items');
    return cart.save();
  }

  // ─── REMOVE ITEM ──────────────────────────────────────────────────────────

  async removeItem(
    productId: string,
    variantId: string,
    customerId?: string,
    guestId?: string,
  ): Promise<CartDocument> {
    if (!customerId && !guestId)
      throw new BadRequestException(
        'Send a Bearer token (logged-in) or guestId (guest)',
      );

    const cart = await this.getOrCreateCart(customerId, guestId);
    const idx  = this.findItemIndex(cart, productId, variantId);
    if (idx < 0) throw new NotFoundException('Item not found in cart');

    await this.inventoryService.releaseStock(
      productId,
      variantId,
      cart.items[idx].quantity,
    );
    cart.items.splice(idx, 1);

    await this.recalcTotals(cart);
    cart.markModified('items');
    return cart.save();
  }

  // ─── CLEAR CART ───────────────────────────────────────────────────────────

  async clearCart(customerId?: string, guestId?: string): Promise<void> {
    if (!customerId && !guestId)
      throw new BadRequestException(
        'Send a Bearer token (logged-in) or guestId (guest)',
      );

    const cart = await this.cartModel.findOne(
      customerId
        ? { customerId: new Types.ObjectId(customerId) }
        : { guestId },
    );
    if (!cart || cart.items.length === 0) return;

    await Promise.all(
      cart.items.map((item) =>
        this.inventoryService.releaseStock(
          item.productId.toString(),
          item.variantId.toString(),
          item.quantity,
        ),
      ),
    );

    cart.items           = [];
    cart.mrpTotal        = 0;
    cart.subTotal        = 0;
    cart.totalDiscount   = 0;
    cart.discountPercent = 0;
    cart.shippingCharge  = 0;
    cart.platformFee     = 0;
    cart.tax             = 0;
    cart.orderTotal      = 0;
    cart.itemCount       = 0;
    cart.totalQuantity   = 0;
    await cart.save();
  }

  // ─── MERGE GUEST → CUSTOMER ───────────────────────────────────────────────

  async mergeGuestCart(
    customerId: string,
    dto: MergeCartDto,
  ): Promise<CartDocument> {
    const [guestCart, customerCart] = await Promise.all([
      this.cartModel.findOne({ guestId: dto.guestId }),
      this.getOrCreateCart(customerId),
    ]);

    if (!guestCart || guestCart.items.length === 0) return customerCart;

    for (const guestItem of guestCart.items) {
      const pId = guestItem.productId.toString();
      const vId = guestItem.variantId.toString();
      const idx = this.findItemIndex(customerCart, pId, vId);

      if (idx >= 0) {
        await this.inventoryService
          .reserveStock(pId, vId, guestItem.quantity)
          .catch(() => { /* skip if stock gone */ });
        customerCart.items[idx].quantity += guestItem.quantity;
      } else {
        customerCart.items.push({ ...guestItem });
      }
    }

    await this.recalcTotals(customerCart);
    customerCart.markModified('items');
    await customerCart.save();

    await this.cartModel.deleteOne({ _id: guestCart._id });
    return customerCart;
  }
}