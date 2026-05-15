import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { Shipment, ShipmentDocument, ShipmentStatus } from './schemas/shipment.schema';
import { Order, OrderDocument, OrderStatus } from '../checkout/schemas/order.schema';
import { Product, ProductDocument } from '../Product/schemas/product.schema';
import { ekartConfig } from '../../config/ekart.config';
import { AdminShipmentFilterDto } from './dto/shipment.dto';
import { paginate } from '../../common/pagination';

function toPhoneInt(phone: string | null | undefined): number {
  if (!phone) return 0;
  const digits = phone.replace(/\D/g, '');
  const ten    = digits.slice(-10);
  return parseInt(ten, 10) || 0;
}

function toPincodeInt(pincode: string | null | undefined): number {
  if (!pincode) return 0;
  return parseInt(String(pincode).replace(/\D/g, ''), 10) || 0;
}

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  private cachedToken:    string | null = null;
  private tokenExpiresAt: number        = 0;

  constructor(
    @InjectModel(Shipment.name)
    private readonly shipmentModel: Model<ShipmentDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}


  private async getAccessToken(): Promise<string> {

    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.cachedToken;
    }

    if (!ekartConfig.clientId || !ekartConfig.username || !ekartConfig.password) {
      throw new InternalServerErrorException(
        'eKart credentials not configured. Add EKART_CLIENT_ID, EKART_USERNAME, EKART_PASSWORD to .env',
      );
    }

    try {
      const { data } = await axios.post(
        `https://app.elite.ekartlogistics.in/integrations/v2/auth/token/${ekartConfig.clientId}`,
        { username: ekartConfig.username, password: ekartConfig.password },
        { headers: { 'Content-Type': 'application/json' } },
      );
      console.log("ekart token response------------------->",data)
      this.cachedToken    = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
      this.logger.log(`eKart token refreshed | expires in ${data.expires_in}s`);
      return this.cachedToken!;
    } catch (err: any) {
      this.logger.error('eKart auth failed', err?.response?.data ?? err.message);
      throw new InternalServerErrorException(
        'eKart authentication failed. Check credentials in .env',
      );
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async calculateShipmentWeight(
    orderItems: Array<{
      productId:   Types.ObjectId;
      variantId?:  Types.ObjectId;
      quantity:    number;
      sellerSkuId: string;
    }>,
  ): Promise<{ totalWeightGrams: number; totalWeightKg: number; totalItemCount: number }> {
    const totalItemCount = orderItems.reduce((s, i) => s + i.quantity, 0);

    const skuIds = orderItems.map((i) => i.sellerSkuId).filter(Boolean);
    const products: ProductDocument[] = skuIds.length
      ? await this.productModel.find({
          sellerSkuId:      { $in: skuIds },
          'flags.isDeleted': false,         
        })
      : [];

    const productMap = new Map<string, ProductDocument>();
    for (const p of products) productMap.set(p.sellerSkuId, p);

    let totalWeightKg = 0;

    for (const item of orderItems) {
      const product = productMap.get(item.sellerSkuId);
      let itemWeight = 0.5; 

      if (product) {
        const variant = item.variantId
          ? (product.variants as any[]).find(
              (v) => v._id.toString() === item.variantId!.toString(),
            )
          : (product.variants as any[])[0];

        if (variant?.shipping?.weightKg && variant.shipping.weightKg > 0) {
          itemWeight = variant.shipping.weightKg;
          this.logger.debug(
            `SKU ${item.sellerSkuId}: weightKg=${itemWeight} (variant DB)`,
          );
        } else {
          this.logger.debug(
            `SKU ${item.sellerSkuId}: weightKg=0.5 (fallback — no variant shipping dims)`,
          );
        }
      }

      totalWeightKg += itemWeight * item.quantity;
    }

    totalWeightKg = parseFloat(Math.max(totalWeightKg, 0.1).toFixed(3));

    const totalWeightGrams = Math.ceil(totalWeightKg * 1000);
console.log("totalweightkg------------------->",totalWeightKg)
    this.logger.log(
      `Shipment weight: ${totalWeightKg}kg (${totalWeightGrams}g) for ${totalItemCount} item(s)`,
    );
    return { totalWeightGrams, totalWeightKg, totalItemCount };
  }

  private async getPackageDimensions(
    orderItems: Array<{ sellerSkuId: string; variantId?: Types.ObjectId }>,
  ): Promise<{ lengthCm: number; breadthCm: number; heightCm: number }> {
    const defaults = { lengthCm: 30, breadthCm: 25, heightCm: 10 };

    const firstItem = orderItems[0];
    if (!firstItem?.sellerSkuId) return defaults;

    const product = await this.productModel.findOne({
      sellerSkuId:       firstItem.sellerSkuId,
      'flags.isDeleted': false,
    });
    if (!product) return defaults;

    const variant = firstItem.variantId
      ? (product.variants as any[]).find(
          (v) => v._id.toString() === firstItem.variantId!.toString(),
        )
      : (product.variants as any[])[0];

    const s = variant?.shipping;
    console.log("dimession of shipment-------------------->", s)
    return {
      lengthCm:  s?.lengthCm  && s.lengthCm  > 0 ? Math.ceil(s.lengthCm)  : defaults.lengthCm,
      breadthCm: s?.breadthCm && s.breadthCm > 0 ? Math.ceil(s.breadthCm) : defaults.breadthCm,
      heightCm:  s?.heightCm  && s.heightCm  > 0 ? Math.ceil(s.heightCm)  : defaults.heightCm,
    };
  }

  // 1. CREATE SHIPMENT ───────────────────────────────────────────────────────────────

  async createShipment(orderId: string): Promise<ShipmentDocument> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.shipmentModel.findOne({
      orderId: new Types.ObjectId(orderId),
    });
    if (existing?.awbNumber) {
      this.logger.log(`Shipment already has AWB for order ${order.orderNumber} — skipping`);
      return existing;
    }

    const isCOD       = order.paymentMethod === 'Cash';
    const paymentMode = isCOD ? 'COD' : 'Prepaid';
    const codAmount   = isCOD ? order.orderTotal : 0;
    const addr        = order.shippingAddress;

    const { totalWeightGrams, totalWeightKg, totalItemCount } =
      await this.calculateShipmentWeight(
        order.items.map((i) => ({
          productId:   i.productId,
          variantId:   (i as any).variantId,   
          quantity:    i.quantity,
          sellerSkuId: i.sellerSkuId,
        })),
      );

    const dims = await this.getPackageDimensions(
      order.items.map((i) => ({
        sellerSkuId: i.sellerSkuId,
        variantId:   (i as any).variantId,
      })),
    );

    const productsDesc = order.items
      .slice(0, 3)
      .map((i) => `${i.productName ?? i.sellerSkuId} x${i.quantity}`)
      .join(', ');

    const rawItemsTax = order.items.reduce(
      (s, i) => s + ((i as any).itemTax ?? 0),
      0,
    );

    const couponDiscount = (order as any).couponDiscount ?? 0;
    const originalTotal  =
      order.subTotal +
      order.shippingCharge +
      order.platformFee +
      order.tax;
    const discountRatio  = originalTotal > 0 ? order.orderTotal / originalTotal : 1;

    const taxValue      = parseFloat((rawItemsTax * discountRatio).toFixed(2));
    const taxableAmount = parseFloat((order.orderTotal - taxValue).toFixed(2));

    const consigneePhone = toPhoneInt(order.mobile);
    const pickupPhone    = toPhoneInt(ekartConfig.pickup.phone);
    const consigneePin   = toPincodeInt(addr.pincode);
    const pickupPin      = toPincodeInt(ekartConfig.pickup.pincode);

    const payload = {
      seller_name:          ekartConfig.pickup.name,
      seller_address:       `${ekartConfig.pickup.address}, ${ekartConfig.pickup.city}, ${ekartConfig.pickup.state} - ${ekartConfig.pickup.pincode}`,
      seller_gst_tin:       ekartConfig.sellerGstTin ?? 'NA',
      order_number:         order.orderNumber,
      invoice_number:       order.orderNumber,
      invoice_date:         new Date().toISOString().split('T')[0],  
      consignee_name:            `${addr.firstName} ${addr.lastName}`.trim(),
      consignee_alternate_phone: order.alternatePhone ?? order.mobile,  
      consignee_gst_amount:      0,
      products_desc:     productsDesc,
      category_of_goods: 'Apparel',
      hsn_code:          '6211',
      quantity:          totalItemCount,
      total_amount:    order.orderTotal,
      taxable_amount:  taxableAmount,
      tax_value:       taxValue,
      commodity_value: String(taxableAmount),
      payment_mode: paymentMode,
      cod_amount:   codAmount,
      weight: totalWeightGrams,
      length: dims.lengthCm,
      width:  dims.breadthCm,
      height: dims.heightCm,
      return_reason: '',
      drop_location: {
        name:    `${addr.firstName} ${addr.lastName}`.trim(),
        address: addr.address,
        city:    addr.city,
        state:   addr.state,
        country: addr.country ?? 'India',
        phone:   consigneePhone,    
        pin:     consigneePin,     
      },
      pickup_location: {
        name:    ekartConfig.pickup.name,
        address: ekartConfig.pickup.address,
        city:    ekartConfig.pickup.city,
        state:   ekartConfig.pickup.state,
        country: 'India',
        phone:   pickupPhone,       
        pin:     pickupPin,         
      },
      return_location: {
        name:    ekartConfig.pickup.name,
        address: ekartConfig.pickup.address,
        city:    ekartConfig.pickup.city,
        state:   ekartConfig.pickup.state,
        country: 'India',
        phone:   pickupPhone,
        pin:     pickupPin,
      },
    };

    this.logger.log(
      `Creating eKart shipment | order: ${order.orderNumber} | mode: ${paymentMode} | weight: ${totalWeightGrams}g`,
    );

    let ekartResp: any;
    let lastError: string | null = null;
console.log("eKart create shipment payload----------------------------->",payload)
    try {
      const headers = await this.getHeaders();
      // Confirmed endpoint: PUT /api/v1/package/create
      const { data } = await axios.put(
        'https://app.elite.ekartlogistics.in/api/v1/package/create',
        payload,
        { headers },
      );
      ekartResp = data;
      console.log("eKart create shipment response------------------->",data)
      this.logger.log(
        `eKart shipment created | order: ${order.orderNumber} | tracking_id: ${ekartResp?.tracking_id ?? 'N/A'}`,
      );
    } catch (err: any) {
      lastError = err?.response?.data
        ? JSON.stringify(err.response.data)
        : (err.message ?? 'Unknown error');
      this.logger.error(
        `eKart create shipment failed for order ${order.orderNumber}`,
        lastError,
      );

      const failedShipment = existing ?? new this.shipmentModel({
        orderId:     new Types.ObjectId(orderId),
        customerId:  order.customerId,
        orderNumber: order.orderNumber,
        status:      ShipmentStatus.PENDING,
        paymentType: paymentMode,
        codAmount,
        deliveryAddress: addr,
        mobile:      order.mobile,
        email:       order.email,
        weightKg:    totalWeightKg,
        itemCount:   totalItemCount,
      });
      failedShipment.lastError = lastError;
      await failedShipment.save();

      throw new InternalServerErrorException(
        'Failed to create shipment with eKart. Shipment saved as Pending — use admin retry endpoint.',
      );
    }

    const awbNumber       = ekartResp?.tracking_id ?? ekartResp?.awb_number ?? null;
    const ekartShipmentId = ekartResp?.tracking_id ?? null;
    const trackingUrl     = awbNumber
      ? `https://app.elite.ekartlogistics.in/track/${awbNumber}`
      : null;
    const labelUrl        = ekartResp?.label_url ?? null;

    const shipment = existing ?? new this.shipmentModel({
      orderId:     new Types.ObjectId(orderId),
      customerId:  order.customerId,
      orderNumber: order.orderNumber,
    });

    shipment.awbNumber           = awbNumber;
    shipment.ekartShipmentId     = ekartShipmentId;
    shipment.trackingUrl         = trackingUrl;
    shipment.labelUrl            = labelUrl;
    shipment.status              = awbNumber ? ShipmentStatus.CREATED : ShipmentStatus.PENDING;
    shipment.paymentType         = paymentMode;
    shipment.codAmount           = codAmount;
    shipment.deliveryAddress     = addr;
    shipment.mobile              = order.mobile;
    shipment.email               = order.email;
    shipment.weightKg            = totalWeightKg;
    shipment.itemCount           = totalItemCount;
    shipment.ekartCreateResponse = ekartResp;
    shipment.lastError           = null;
    await shipment.save();

    await this.orderModel.findByIdAndUpdate(orderId, {
      $set: { orderStatus: OrderStatus.PROCESSING },
    });

    return shipment;
  }

  // 2. TRACK SHIPMENT ───────────────────────────────────────────────────────────────

  async trackShipment(awbNumber: string): Promise<ShipmentDocument> {
    const shipment = await this.shipmentModel.findOne({ awbNumber });
    if (!shipment) throw new NotFoundException(`No shipment found for AWB: ${awbNumber}`);

    const terminalStatuses = [
      ShipmentStatus.DELIVERED,
      ShipmentStatus.RTO_DELIVERED,
      ShipmentStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(shipment.status as ShipmentStatus)) {
      this.logger.log(`Track skipped — AWB ${awbNumber} in terminal status: ${shipment.status}`);
      return shipment;
    }

    try {
      const headers = await this.getHeaders();
      const { data } = await axios.get(
        `https://app.elite.ekartlogistics.in/api/v1/track/${awbNumber}`,
        { headers },
      );

      this.logger.debug(`Track response for ${awbNumber}:`, JSON.stringify(data));

      const trackData   = data?.track ?? data;
      const ekartStatus = (trackData?.status ?? '').toString();

      const statusMap: Record<string, ShipmentStatus> = {
        'Order Placed':          ShipmentStatus.CREATED,
        'Pickup Scheduled':      ShipmentStatus.PICKUP_SCHEDULED,
        'Out for Pickup':        ShipmentStatus.PICKUP_SCHEDULED,
        'Pickup Pending':        ShipmentStatus.PICKUP_SCHEDULED,
        'Picked Up':             ShipmentStatus.PICKED_UP,
        'In Transit':            ShipmentStatus.IN_TRANSIT,
        'Shipment Delayed':      ShipmentStatus.IN_TRANSIT,
        'RTO In Transit':        ShipmentStatus.IN_TRANSIT,
        'Out for Delivery':      ShipmentStatus.OUT_FOR_DELIVERY,
        'RTO Out for Delivery':  ShipmentStatus.OUT_FOR_DELIVERY,
        'Delivered':             ShipmentStatus.DELIVERED,
        'RTO Delivered':         ShipmentStatus.RTO_DELIVERED,
        'Undelivered':           ShipmentStatus.DELIVERY_FAILED,
        'RTO Failed':            ShipmentStatus.DELIVERY_FAILED,
        'Lost':                  ShipmentStatus.DELIVERY_FAILED,
        'Damaged':               ShipmentStatus.DELIVERY_FAILED,
        'RTO Requested':         ShipmentStatus.RTO_INITIATED,
        'Seller RTO Requested':  ShipmentStatus.RTO_INITIATED,
        'Cancelled':             ShipmentStatus.CANCELLED,
        'Seller Cancelled':      ShipmentStatus.CANCELLED,
        'Pickup Cancelled':      ShipmentStatus.CANCELLED,
        'Not Serviceable':       ShipmentStatus.CANCELLED,
        'Not Picked':            ShipmentStatus.PENDING,
      };
      const mappedStatus = statusMap[ekartStatus] ?? (shipment.status as ShipmentStatus);

      const rawDetails: any[] = trackData?.details ?? [];
      const trackingEvents = rawDetails.map((e: any) => ({
        timestamp:   new Date(e.ctime ?? Date.now()),
        status:      e.status      ?? '',
        location:    e.location    ?? '',
        description: e.desc        ?? '',
      }));

      shipment.status         = mappedStatus;
      shipment.trackingEvents = trackingEvents;
      shipment.lastTrackedAt  = new Date();
      await shipment.save();

      const orderStatusMap: Partial<Record<ShipmentStatus, OrderStatus>> = {
        [ShipmentStatus.PICKED_UP]:        OrderStatus.PROCESSING,
        [ShipmentStatus.IN_TRANSIT]:       OrderStatus.SHIPPED,
        [ShipmentStatus.OUT_FOR_DELIVERY]: OrderStatus.SHIPPED,
        [ShipmentStatus.DELIVERED]:        OrderStatus.DELIVERED,
        [ShipmentStatus.CANCELLED]:        OrderStatus.CANCELLED,
      };
      const newOrderStatus = orderStatusMap[mappedStatus];
      if (newOrderStatus) {
        await this.orderModel.findByIdAndUpdate(shipment.orderId, {
          $set: { orderStatus: newOrderStatus },
        });
      }

      this.logger.log(`Tracked AWB ${awbNumber} | "${ekartStatus}" → ${mappedStatus}`);
    } catch (err: any) {
      this.logger.error(`Track failed for AWB ${awbNumber}`, err?.response?.data ?? err.message);
    }

    return shipment;
  }

  // 3. CANCEL SHIPMENT ───────────────────────────────────────────────────────────────

  async cancelShipment(awbNumber: string): Promise<ShipmentDocument> {
    const shipment = await this.shipmentModel.findOne({ awbNumber });
    if (!shipment) throw new NotFoundException(`No shipment found for AWB: ${awbNumber}`);

    const cancellable = [
      ShipmentStatus.PENDING,
      ShipmentStatus.CREATED,
      ShipmentStatus.PICKUP_SCHEDULED,
    ];
    if (!cancellable.includes(shipment.status as ShipmentStatus)) {
      throw new BadRequestException(
        `Cannot cancel shipment in status "${shipment.status}". Only cancellable before pickup.`,
      );
    }

    try {
      const headers = await this.getHeaders();
      await axios.delete(
        'https://app.elite.ekartlogistics.in/api/v1/package/cancel',
        {
          headers,
          params: { tracking_id: awbNumber },
        },
      );
      this.logger.log(`Shipment cancelled on eKart | AWB: ${awbNumber}`);
    } catch (err: any) {
      this.logger.error(`eKart cancel failed for AWB ${awbNumber}`, err?.response?.data ?? err.message);
      throw new InternalServerErrorException('Failed to cancel shipment. Please contact support.');
    }

    shipment.status = ShipmentStatus.CANCELLED;
    await shipment.save();
    await this.orderModel.findByIdAndUpdate(shipment.orderId, {
      $set: { orderStatus: OrderStatus.CANCELLED },
    });
    return shipment;
  }

  // 4. CHECK SERVICEABILITY ───────────────────────────────────────────────────────────────

  async checkServiceability(pincode: string): Promise<{
    serviceable:    boolean;
    codAvailable:   boolean;
    estimatedDays?: number;
    pincode:        string;
    message:        string;
  }> {
    try {
      const headers = await this.getHeaders();
      // Spec: GET /api/v2/serviceability/{pincode}
      const { data } = await axios.get(
        `https://app.elite.ekartlogistics.in/api/v2/serviceability/${pincode}`,
        { headers },
      );

      this.logger.debug(`Serviceability for ${pincode}:`, JSON.stringify(data));

      const serviceable  = data?.status ?? false;
      const codAvailable = data?.details?.cod_available ?? data?.details?.isCODAvailable ?? false;
      const days         = data?.details?.estimated_days ?? data?.details?.sla_days ?? undefined;

      return {
        serviceable,
        codAvailable,
        estimatedDays: days,
        pincode,
        message: serviceable
          ? `Delivery available to ${pincode}${days ? ` (~${days} days)` : ''}`
          : `Delivery not available to pincode ${pincode}. ${data?.remark ?? ''}`.trim(),
      };
    } catch (err: any) {
      this.logger.warn(
        `Serviceability check failed for ${pincode}:`,
        err?.response?.data ?? err.message,
      );
      return {
        serviceable: true,
        codAvailable: true,
        pincode,
        message: 'Serviceability check unavailable. Assuming serviceable.',
      };
    }
  }

  // 5. DOWNLOAD PACKING LABEL ───────────────────────────────────────────────────────────────

  async downloadLabel(awbNumbers: string[], jsonOnly = false): Promise<Buffer> {
    const headers = await this.getHeaders();
    try {
      const { data } = await axios.post(
        `https://app.elite.ekartlogistics.in/api/v1/package/label${jsonOnly ? '?json_only=true' : ''}`,
        { ids: awbNumbers },
        { headers, responseType: jsonOnly ? 'json' : 'arraybuffer' },
      );
      this.logger.log(`Label downloaded for AWBs: ${awbNumbers.join(', ')}`);
      return jsonOnly ? Buffer.from(JSON.stringify(data)) : Buffer.from(data);
    } catch (err: any) {
      this.logger.error('Download label failed', err?.response?.data ?? err.message);
      throw new InternalServerErrorException('Failed to download label from eKart.');
    }
  }

  // 6. DOWNLOAD MANIFEST ───────────────────────────────────────────────────────────────

  async downloadManifest(awbNumbers: string[]): Promise<any> {
    const headers = await this.getHeaders();
    try {
      const { data } = await axios.post(
        'https://app.elite.ekartlogistics.in/data/v2/generate/manifest',
        { ids: awbNumbers },
        { headers },
      );
      this.logger.log(`Manifest generated for AWBs: ${awbNumbers.join(', ')}`);
      return data;
    } catch (err: any) {
      this.logger.error('Download manifest failed', err?.response?.data ?? err.message);
      throw new InternalServerErrorException('Failed to download manifest from eKart.');
    }
  }

  // 7. NDR ACTION ───────────────────────────────────────────────────────────────

  async handleNdr(
    awbNumber: string,
    action:    'Re-Attempt' | 'RTO' | 'Edit',
    options?:  { date?: number; address?: string; phone?: string; instructions?: string },
  ): Promise<any> {
    const shipment = await this.shipmentModel.findOne({ awbNumber });
    if (!shipment) throw new NotFoundException(`No shipment found for AWB: ${awbNumber}`);

    if (shipment.status !== ShipmentStatus.DELIVERY_FAILED) {
      throw new BadRequestException(
        `NDR actions only allowed on DeliveryFailed shipments. Current status: ${shipment.status}`,
      );
    }

    const headers = await this.getHeaders();
    const payload: Record<string, any> = { wbn: awbNumber, action, ...options };

    try {
      const { data } = await axios.post(
        'https://app.elite.ekartlogistics.in/api/v2/package/ndr',
        payload,
        { headers },
      );
      this.logger.log(`NDR action "${action}" submitted for AWB: ${awbNumber}`);

      if (action === 'RTO') {
        shipment.status = ShipmentStatus.RTO_INITIATED;
        await shipment.save();
      }

      return data;
    } catch (err: any) {
      this.logger.error(`NDR action failed for AWB ${awbNumber}`, err?.response?.data ?? err.message);
      throw new InternalServerErrorException('Failed to submit NDR action to eKart.');
    }
  }

  // 6. HANDLE INCOMING EKART WEBHOOK ───────────────────────────────────────────────────────────────

  async handleEkartWebhook(payload: any): Promise<void> {
    this.logger.log('eKart webhook received:', JSON.stringify(payload, null, 2));

    const trackingId  = payload?.id;         
    const orderNumber = payload?.orderNumber;
    const status      = payload?.status;      

    if (!trackingId && !orderNumber) {
      this.logger.warn('eKart webhook missing id and orderNumber — ignoring');
      return;
    }

    const shipment = trackingId
      ? await this.shipmentModel.findOne({ awbNumber: trackingId })
      : await this.shipmentModel.findOne({ orderNumber });

    if (!shipment) {
      this.logger.warn(`eKart webhook: no shipment found for id=${trackingId} orderNumber=${orderNumber}`);
      return;
    }

    if (status) {
      const statusMap: Record<string, ShipmentStatus> = {
        'Order Placed':         ShipmentStatus.CREATED,
        'Pickup Scheduled':     ShipmentStatus.PICKUP_SCHEDULED,
        'Out for Pickup':       ShipmentStatus.PICKUP_SCHEDULED,
        'Picked Up':            ShipmentStatus.PICKED_UP,
        'In Transit':           ShipmentStatus.IN_TRANSIT,
        'Shipment Delayed':     ShipmentStatus.IN_TRANSIT,
        'Out for Delivery':     ShipmentStatus.OUT_FOR_DELIVERY,
        'Delivered':            ShipmentStatus.DELIVERED,
        'Undelivered':          ShipmentStatus.DELIVERY_FAILED,
        'RTO Requested':        ShipmentStatus.RTO_INITIATED,
        'RTO In Transit':       ShipmentStatus.IN_TRANSIT,
        'RTO Out for Delivery': ShipmentStatus.OUT_FOR_DELIVERY,
        'RTO Delivered':        ShipmentStatus.RTO_DELIVERED,
        'Cancelled':            ShipmentStatus.CANCELLED,
        'Seller Cancelled':     ShipmentStatus.CANCELLED,
      };

      const mapped = statusMap[status];
      if (mapped) {
        shipment.status = mapped;
        shipment.trackingEvents.push({
          timestamp:   new Date(payload.ctime ?? Date.now()),
          status,
          location:    payload.location ?? '',
          description: payload.desc     ?? '',
        });
        shipment.lastTrackedAt = new Date();
        await shipment.save();

        const orderStatusMap: Partial<Record<ShipmentStatus, OrderStatus>> = {
          [ShipmentStatus.PICKED_UP]:        OrderStatus.PROCESSING,
          [ShipmentStatus.IN_TRANSIT]:       OrderStatus.SHIPPED,
          [ShipmentStatus.OUT_FOR_DELIVERY]: OrderStatus.SHIPPED,
          [ShipmentStatus.DELIVERED]:        OrderStatus.DELIVERED,
          [ShipmentStatus.CANCELLED]:        OrderStatus.CANCELLED,
        };
        const newOrderStatus = orderStatusMap[mapped];
        if (newOrderStatus) {
          await this.orderModel.findByIdAndUpdate(shipment.orderId, {
            $set: { orderStatus: newOrderStatus },
          });
        }
        this.logger.log(`eKart webhook processed | AWB: ${trackingId} | status: ${status} → ${mapped}`);
      }
    }

    if (!shipment.awbNumber && trackingId) {
      shipment.awbNumber       = trackingId;
      shipment.ekartShipmentId = trackingId;
      shipment.trackingUrl     = `https://app.elite.ekartlogistics.in/track/${trackingId}`;
      shipment.status          = ShipmentStatus.CREATED;
      await shipment.save();
      this.logger.log(`eKart webhook: AWB set for order ${orderNumber} → ${trackingId}`);
    }
  }

  // 7–10. QUERIES + ADMIN ───────────────────────────────────────────────────────────────

  async findByOrderId(orderId: string): Promise<ShipmentDocument> {
    if (!Types.ObjectId.isValid(orderId)) throw new NotFoundException('Shipment not found');
    const shipment = await this.shipmentModel.findOne({
      orderId: new Types.ObjectId(orderId),
    });
    if (!shipment) throw new NotFoundException('Shipment not found for this order');
    return shipment;
  }

  async findByAwb(awbNumber: string): Promise<ShipmentDocument> {
    const shipment = await this.shipmentModel.findOne({ awbNumber });
    if (!shipment) throw new NotFoundException(`No shipment found for AWB: ${awbNumber}`);
    return shipment;
  }

  async findAll(filters: AdminShipmentFilterDto): Promise<any> {
    const { page, limit, status, orderNumber, awbNumber, customerId } = filters;
    const query: Record<string, any> = {};

    if (status)      query.status      = status;
    if (orderNumber) query.orderNumber = orderNumber;
    if (awbNumber)   query.awbNumber   = awbNumber;
    if (customerId && Types.ObjectId.isValid(customerId))
      query.customerId = new Types.ObjectId(customerId);

    return paginate<ShipmentDocument>(
      this.shipmentModel, query, { page, limit }, { createdAt: -1 },
    );
  }

  async retryShipmentCreation(orderId: string): Promise<ShipmentDocument> {
    const existing = await this.shipmentModel.findOne({
      orderId: new Types.ObjectId(orderId),
    });

    if (existing?.awbNumber) {
      throw new BadRequestException(
        `Shipment already has AWB ${existing.awbNumber}. Nothing to retry.`,
      );
    }

    if (existing) {
      await this.shipmentModel.deleteOne({ _id: existing._id });
    }

    return this.createShipment(orderId);
  }
}