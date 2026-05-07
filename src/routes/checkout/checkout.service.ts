import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderAddress, OrderItem } from './schemas/order.schema';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import {
  CustomerAddress,
  CustomerAddressDocument,
} from '../customer-address/schemas/customer-address.schema';
import { CheckoutDto, InlineAddressDto, OrderFilterDto } from './dto/checkout.dto';
import { computeTotals } from '../../common/utils/order-totals.util';
import { paginate, PaginatedResult, PaginationDto } from '../../common/pagination';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(CustomerAddress.name)
    private readonly addressModel: Model<CustomerAddressDocument>,
  ) {}

  async placeOrder(
    customerId: string,
    dto: CheckoutDto,
  ): Promise<OrderDocument> {

    this.validateAddressInputs(dto);

    const cart = await this.cartModel.findOne({
      customerId: new Types.ObjectId(customerId),
    });
    if (!cart || cart.items.length === 0)
      throw new BadRequestException('Your cart is empty');

    const [shippingAddress, billingAddress] = await Promise.all([
      this.resolveAddress(customerId, dto.shippingAddressId, dto.shippingAddress, 'shipping'),
      this.resolveAddress(customerId, dto.billingAddressId,  dto.billingAddress,  'billing'),
    ]);

    const items: OrderItem[] = cart.items.map((i) => ({
      productId:       i.productId,
      quantity:        i.quantity,
      priceAtOrder:    i.priceAtAdd,
      mrpAtOrder:      i.mrpAtAdd,
      discountAtOrder: i.discountAtAdd,
      itemTotal:       i.priceAtAdd * i.quantity,
      productName:     i.productName,
      sellerSkuId:     i.sellerSkuId,
      size:            i.size,
      color:           i.color,
      mainImageUrl:    i.mainImageUrl,
    }));

    // Use shared utility — same config as cart
    const totals = computeTotals(
      cart.items.map((i) => ({
        mrpAtAdd:   i.mrpAtAdd,
        priceAtAdd: i.priceAtAdd,
        quantity:   i.quantity,
      })),
    );

    const orderNumber = await this.generateOrderNumber();

    const order = new this.orderModel({
      customerId:      new Types.ObjectId(customerId),
      orderNumber,
      items,
      shippingAddress,
      billingAddress,
      mobile:          dto.mobile,
      email:           dto.email ?? null,
      mrpTotal:        totals.mrpTotal,
      subTotal:        totals.subTotal,
      totalDiscount:   totals.totalDiscount,
      discountPercent: totals.discountPercent,
      shippingCharge:  totals.shippingCharge,
      platformFee:     totals.platformFee,
      tax:             totals.tax,
      orderTotal:      totals.orderTotal,
      paymentMethod:   dto.paymentMethod,
    });

    await order.save();

    // Clear cart after successful order
    await this.cartModel.findOneAndUpdate(
      { customerId: new Types.ObjectId(customerId) },
      {
        $set: {
          items: [], mrpTotal: 0, subTotal: 0,
          totalDiscount: 0, discountPercent: 0,
          shippingCharge: 0, platformFee: 0,
          tax: 0, orderTotal: 0,
          itemCount: 0, totalQuantity: 0,
        },
      },
    );

    return order;
  }

  async findById(customerId: string, orderId: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId))
      throw new NotFoundException('Order not found');

    const order = await this.orderModel.findOne({
      _id:        new Types.ObjectId(orderId),
      customerId: new Types.ObjectId(customerId),
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAll(
  customerId: string,
  pagination: PaginationDto,
  filters:    OrderFilterDto,
): Promise<PaginatedResult<OrderDocument>> {
  const query: Record<string, any> = {
    customerId: new Types.ObjectId(customerId),
  };

  if (filters.orderStatus)   query.orderStatus   = filters.orderStatus;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};
    if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
    if (filters.toDate)   query.createdAt.$lte = new Date(filters.toDate);
  }

  return paginate<OrderDocument>(
    this.orderModel,
    query,
    pagination,
    { createdAt: -1 },
  );
}

  // ─── Private helpers ──────────────────────────────────────────────────────

  private validateAddressInputs(dto: CheckoutDto): void {
    if (!dto.shippingAddressId && !dto.shippingAddress)
      throw new BadRequestException('Provide either shippingAddressId or shippingAddress');
    if (dto.shippingAddressId && dto.shippingAddress)
      throw new BadRequestException('Provide only one of shippingAddressId or shippingAddress');
    if (!dto.billingAddressId && !dto.billingAddress)
      throw new BadRequestException('Provide either billingAddressId or billingAddress');
    if (dto.billingAddressId && dto.billingAddress)
      throw new BadRequestException('Provide only one of billingAddressId or billingAddress');
  }

  private async resolveAddress(
    customerId: string,
    addressId:  string | undefined,
    inlineDto:  InlineAddressDto | undefined,
    label:      'shipping' | 'billing',
  ): Promise<OrderAddress> {
    if (addressId) {
      if (!Types.ObjectId.isValid(addressId))
        throw new NotFoundException(`${label} address not found`);

      const saved = await this.addressModel.findOne({
        _id:        new Types.ObjectId(addressId),
        customerId: new Types.ObjectId(customerId),
        isDeleted:  false,
      });
      if (!saved)
        throw new NotFoundException(`${label} address not found or does not belong to you`);

      return {
        firstName: saved.firstName, lastName: saved.lastName,
        address:   saved.address,   city:     saved.city,
        state:     saved.state,     pincode:  saved.pincode,
        country:   saved.country,
      };
    }

    const normalized = { ...inlineDto!, country: inlineDto!.country ?? 'India' };

    // Save if not duplicate and under limit
    const [existing, count] = await Promise.all([
      this.addressModel.findOne({
        customerId: new Types.ObjectId(customerId),
        isDeleted:  false,
        firstName:  normalized.firstName,
        lastName:   normalized.lastName,
        address:    normalized.address,
        city:       normalized.city,
        state:      normalized.state,
        pincode:    normalized.pincode,
        country:    normalized.country,
      }),
      this.addressModel.countDocuments({
        customerId: new Types.ObjectId(customerId),
        isDeleted:  false,
      }),
    ]);

    if (!existing && count < 5) {
      await this.addressModel.create({
        ...normalized,
        customerId: new Types.ObjectId(customerId),
        isDefault:  false,
      });
    }

    return normalized as OrderAddress;
  }

  private async generateOrderNumber(): Promise<string> {
    const d      = new Date();
    const prefix = `ORD-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const count  = await this.orderModel.countDocuments();
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
}