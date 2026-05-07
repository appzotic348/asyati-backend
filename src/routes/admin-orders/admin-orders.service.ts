import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../checkout/schemas/order.schema';
import {
  Payment,
  PaymentDocument,
} from '../payment/schemas/payment.schema';
import {
  AdminOrderFilterDto,
  AdminPaymentFilterDto,
} from './dto/admin-orders-filter.dto';
import {
  paginate,
  PaginatedResult,
  PaginationDto,
} from '../../common/pagination';

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  // GET ALL ORDERS ──────────────────────────────────────────────────────

  async findAllOrders(
    filters: AdminOrderFilterDto,
  ): Promise<PaginatedResult<OrderDocument>> {
    const {
      page, limit,
      orderStatus, paymentStatus, paymentMethod,
      orderNumber, mobile, customerId,
      dateFrom, dateTo,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = filters;

    const query: Record<string, any> = {};

    if (orderStatus)   query.orderStatus   = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (orderNumber)   query.orderNumber   = orderNumber;
    if (mobile)        query.mobile        = mobile;

    if (customerId && Types.ObjectId.isValid(customerId))
      query.customerId = new Types.ObjectId(customerId);

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const allowedSort = ['orderTotal', 'createdAt', 'orderStatus'];
    const safeSortBy  = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const sort: Record<string, 1 | -1> = {
      [safeSortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const pagination: PaginationDto = { page, limit };

    return paginate<OrderDocument>(
      this.orderModel,
      query,
      pagination,
      sort,
    );
  }
// GET SINGLE ORDER  ──────────────────────────────────────────────────────

  async findOrderById(orderId: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId))
      throw new NotFoundException('Order not found');

    const order = await this.orderModel
      .findById(new Types.ObjectId(orderId))
      .populate('customerId', 'name mobile email')
      .exec();

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
// UPDATED ORDER STATUS ──────────────────────────────────────────────────────

  async updateOrderStatus(
    orderId: string,
    orderStatus: OrderStatus,
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId))
      throw new NotFoundException('Order not found');

    const order = await this.orderModel.findByIdAndUpdate(
      new Types.ObjectId(orderId),
      { $set: { orderStatus } },
      { new: true },
    );
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  //GET ALL ORDER STATS ──────────────────────────────────────────────────────

  async getOrderStats() {
    const [statusCounts, paymentStats, revenueToday, revenueAll] =
      await Promise.all([
        // Order counts by status
        this.orderModel.aggregate([
          { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
        ]),

        this.orderModel.aggregate([
          {
            $group: {
              _id:   { method: '$paymentMethod', status: '$paymentStatus' },
              count: { $sum: 1 },
              total: { $sum: '$orderTotal' },
            },
          },
        ]),

        this.orderModel.aggregate([
          {
            $match: {
              paymentStatus: 'Paid',
              createdAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
          },
          {
            $group: {
              _id:   null,
              total: { $sum: '$orderTotal' },
              count: { $sum: 1 },
            },
          },
        ]),

        this.orderModel.aggregate([
          { $match: { paymentStatus: 'Paid' } },
          {
            $group: {
              _id:   null,
              total: { $sum: '$orderTotal' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    return {
      ordersByStatus:   statusCounts.reduce(
        (acc, c) => ({ ...acc, [c._id]: c.count }),
        {} as Record<string, number>,
      ),
      paymentBreakdown: paymentStats,
      revenueToday:     revenueToday[0]  ?? { total: 0, count: 0 },
      revenueAllTime:   revenueAll[0]    ?? { total: 0, count: 0 },
      totalOrders:      await this.orderModel.countDocuments(),
    };
  }

  // GET ALL PAYMENTS ──────────────────────────────────────────────────────

  async findAllPayments(
    filters: AdminPaymentFilterDto,
  ): Promise<PaginatedResult<PaymentDocument>> {
    const {
      page, limit,
      status, orderNumber, customerId,
      dateFrom, dateTo,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = filters;

    const query: Record<string, any> = {};

    if (status)      query.status      = status;
    if (orderNumber) query.orderNumber = orderNumber;

    if (customerId && Types.ObjectId.isValid(customerId))
      query.customerId = new Types.ObjectId(customerId);

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const allowedSort = ['amount', 'createdAt', 'status'];
    const safeSortBy  = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const sort: Record<string, 1 | -1> = {
      [safeSortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const pagination: PaginationDto = { page, limit };

    return paginate<PaymentDocument>(
      this.paymentModel,
      query,
      pagination,
      sort,
    );
  }
  
  // GET SINGLE PAYMENT ──────────────────────────────────────────────────────

  async findPaymentByOrderId(orderId: string): Promise<PaymentDocument> {
    if (!Types.ObjectId.isValid(orderId))
      throw new NotFoundException('Payment not found');

    const payment = await this.paymentModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .populate('customerId', 'name mobile email')
      .populate('orderId', 'orderNumber orderTotal orderStatus paymentStatus')
      .exec();

    if (!payment)
      throw new NotFoundException('Payment not found for this order');
    return payment;
  }
  
  // GET PAYMENT STATS ──────────────────────────────────────────────────────

  async getPaymentStats() {
    const [statusCounts, volumeToday, volumeAll] = await Promise.all([
      this.paymentModel.aggregate([
        {
          $group: {
            _id:   '$status',
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          },
        },
      ]),

      this.paymentModel.aggregate([
        {
          $match: {
            status:    'PAID',
            createdAt: {
              $gte: new Date(new Date().setHours(0, 0, 0, 0)),
              $lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
        {
          $group: {
            _id:   null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      this.paymentModel.aggregate([
        { $match: { status: 'PAID' } },
        {
          $group: {
            _id:   null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      byStatus: statusCounts.reduce(
        (acc, c) => ({
          ...acc,
          [c._id]: { count: c.count, total: c.total },
        }),
        {} as Record<string, { count: number; total: number }>,
      ),
      volumeToday:   volumeToday[0]  ?? { total: 0, count: 0 },
      volumeAllTime: volumeAll[0]    ?? { total: 0, count: 0 },
      totalPayments: await this.paymentModel.countDocuments(),
    };
  }
}