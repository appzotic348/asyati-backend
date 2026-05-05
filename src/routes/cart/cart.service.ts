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

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  // ─── Private helpers ──────────────────────────────────────────────────────

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

  private buildItem(product: ProductDocument, quantity: number): CartItem {
    const priceAtAdd    = product.sellingPrice;
    const mrpAtAdd      = product.mrp;
    const discountAtAdd = mrpAtAdd - priceAtAdd;

    return {
      productId:         product._id as Types.ObjectId,
      quantity,
      priceAtAdd,
      mrpAtAdd,
      discountAtAdd,
      productName:       `${product.brand} — ${product.styleCode}`,
      sellerSkuId:       product.sellerSkuId,
      size:              product.size,
      color:             product.color,
      mainImageUrl:      product.mainImage?.url ?? '',
      addedAt:           new Date(),
      itemMrpTotal:      mrpAtAdd      * quantity,
      itemSellingTotal:  priceAtAdd    * quantity,
      itemDiscountTotal: discountAtAdd * quantity,
    };
  }

  private recalcTotals(cart: CartDocument): void {
    // Refresh per-item totals first (quantity may have changed)
    for (const item of cart.items) {
      item.itemMrpTotal      = item.mrpAtAdd      * item.quantity;
      item.itemSellingTotal  = item.priceAtAdd     * item.quantity;
      item.itemDiscountTotal = item.discountAtAdd  * item.quantity;
    }

    const mrpTotal      = cart.items.reduce((s, i) => s + i.itemMrpTotal,     0);
    const subTotal      = cart.items.reduce((s, i) => s + i.itemSellingTotal,  0);
    const totalDiscount = mrpTotal - subTotal;
    const discountPercent = mrpTotal > 0
      ? Math.round((totalDiscount / mrpTotal) * 1000) / 10
      : 0;

    cart.mrpTotal        = mrpTotal;
    cart.subTotal        = subTotal;
    cart.totalDiscount   = totalDiscount;
    cart.discountPercent = discountPercent;
    cart.orderTotal      = subTotal;   // no tax — orderTotal === subTotal
    cart.itemCount       = cart.items.length;
    cart.totalQuantity   = cart.items.reduce((s, i) => s + i.quantity, 0);
  }

  private async getActiveProduct(productId: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(productId))
      throw new NotFoundException('Product not found');

    const product = await this.productModel.findOne({
      _id:           new Types.ObjectId(productId),
      isDeleted:     false,
      listingStatus: 'Active',
    });
    if (!product)
      throw new NotFoundException('Product not found or not available');
    return product;
  }

  private async reserveStock(productId: string, qty: number): Promise<void> {
    const result = await this.productModel.findOneAndUpdate(
      {
        _id:           new Types.ObjectId(productId),
        isDeleted:     false,
        listingStatus: 'Active',
        stock:         { $gte: qty },
      },
      { $inc: { stock: -qty } },
    );
    if (!result) throw new BadRequestException('Insufficient stock');
  }

  private async releaseStock(productId: string, qty: number): Promise<void> {
    await this.productModel.findOneAndUpdate(
      { _id: new Types.ObjectId(productId) },
      { $inc: { stock: qty } },
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

    const product = await this.getActiveProduct(dto.productId);
    const cart    = await this.getOrCreateCart(customerId, guestId);

    await this.reserveStock(dto.productId, dto.quantity);

    const existingIdx = cart.items.findIndex(
      (i) => i.productId.toString() === dto.productId,
    );

    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += dto.quantity;
    } else {
      cart.items.push(this.buildItem(product, dto.quantity));
    }

    this.recalcTotals(cart);
    cart.markModified('items');
    return cart.save();
  }

  // ─── UPDATE ITEM ──────────────────────────────────────────────────────────

  async updateItem(
    productId: string,
    dto: UpdateCartItemDto,
    customerId?: string,
  ): Promise<CartDocument> {
    const guestId = customerId ? undefined : dto.guestId;
    if (!customerId && !guestId)
      throw new BadRequestException(
        'Send a Bearer token (logged-in) or guestId (guest)',
      );

    const cart = await this.getOrCreateCart(customerId, guestId);
    const idx  = cart.items.findIndex(
      (i) => i.productId.toString() === productId,
    );
    if (idx < 0) throw new NotFoundException('Item not found in cart');

    const oldQty = cart.items[idx].quantity;
    const newQty = dto.quantity;
    const delta  = newQty - oldQty;

    if (newQty === 0) {
      await this.releaseStock(productId, oldQty);
      cart.items.splice(idx, 1);
    } else if (delta > 0) {
      await this.reserveStock(productId, delta);
      cart.items[idx].quantity = newQty;
    } else if (delta < 0) {
      await this.releaseStock(productId, Math.abs(delta));
      cart.items[idx].quantity = newQty;
    }

    this.recalcTotals(cart);
    cart.markModified('items');
    return cart.save();
  }

  // ─── REMOVE ITEM ──────────────────────────────────────────────────────────

  async removeItem(
    productId: string,
    customerId?: string,
    guestId?: string,
  ): Promise<CartDocument> {
    if (!customerId && !guestId)
      throw new BadRequestException(
        'Send a Bearer token (logged-in) or guestId (guest)',
      );

    const cart = await this.getOrCreateCart(customerId, guestId);
    const idx  = cart.items.findIndex(
      (i) => i.productId.toString() === productId,
    );
    if (idx < 0) throw new NotFoundException('Item not found in cart');

    await this.releaseStock(productId, cart.items[idx].quantity);
    cart.items.splice(idx, 1);

    this.recalcTotals(cart);
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
        this.releaseStock(item.productId.toString(), item.quantity),
      ),
    );

    cart.items         = [];
    cart.mrpTotal      = 0;
    cart.subTotal      = 0;
    cart.totalDiscount = 0;
    cart.discountPercent = 0;
    cart.orderTotal    = 0;
    cart.itemCount     = 0;
    cart.totalQuantity = 0;
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
      const productIdStr = guestItem.productId.toString();
      const existingIdx  = customerCart.items.findIndex(
        (i) => i.productId.toString() === productIdStr,
      );

      if (existingIdx >= 0) {
        customerCart.items[existingIdx].quantity += guestItem.quantity;
      } else {
        customerCart.items.push({ ...guestItem });
      }
    }

    this.recalcTotals(customerCart);
    customerCart.markModified('items');
    await customerCart.save();

    await this.cartModel.deleteOne({ _id: guestCart._id });
    return customerCart;
  }
}