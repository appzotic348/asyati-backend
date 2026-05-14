import {
  Body, Controller, Delete, Get, Param,
  Post, Query, Res, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam,
  ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ShipmentService } from './shipment.service';
import { AdminShipmentFilterDto } from './dto/shipment.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse } from '../../common/response';

// ── CUSTOMER ──────────────────────────────────────────────────────────────────
@ApiTags('Customer - Shipment')
@Controller('customer/shipment')
export class CustomerShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Get('serviceability/:pincode')
  @ApiOperation({
    summary: 'Check if a pincode is serviceable (public)',
    description:
      'Calls eKart `GET /api/v2/serviceability/{pincode}`.\n\n' +
      'Returns whether delivery and COD are available for the given pincode.\n\n' +
      'Call this at checkout before the customer selects a payment method.',
  })
  @ApiParam({ name: 'pincode', example: '560034' })
  @ApiResponse({ status: 200, description: 'Serviceability result.' })
  async serviceability(@Param('pincode') pincode: string) {
    const result = await this.shipmentService.checkServiceability(pincode);
    return successResponse(result);
  }

  @Get('track/:awbNumber')
  @ApiOperation({
    summary: 'Track shipment by AWB number (public)',
    description:
      'Calls eKart `GET /api/v1/track/{id}` and returns updated status.\n\n' +
      'AWB number is returned in `order.awbNumber` after checkout.',
  })
  @ApiParam({ name: 'awbNumber', example: 'FMPC0123456789' })
  @ApiResponse({ status: 200, description: 'Tracking details with full event history.' })
  @ApiResponse({ status: 404, description: 'AWB not found.' })
  async trackByAwb(@Param('awbNumber') awbNumber: string) {
    const shipment = await this.shipmentService.trackShipment(awbNumber);
    return successResponse(shipment);
  }

  @Get('order/:orderId')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Get shipment for a specific order (customer)',
    description: "Returns shipment status and AWB for the logged-in customer's order.",
  })
  @ApiParam({ name: 'orderId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Shipment found.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  async getByOrder(
    @Param('orderId') orderId: string,
    @GetUser() customer: CustomerDocument,
  ) {
    const shipment = await this.shipmentService.findByOrderId(orderId);
    if (shipment.customerId.toString() !== (customer as any)._id.toString()) {
      throw new Error('Shipment not found');
    }
    return successResponse(shipment);
  }
}

// ── PUBLIC WEBHOOK RECEIVER  ────
@ApiTags('Shipment - Webhook')
@Controller('admin/shipments')
export class EkartWebhookController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post('ekart-webhook/receive')
  @ApiOperation({
    summary: 'Receive incoming eKart webhook events (public)',
    description:
      'eKart POSTs here when `track_updated`, `shipment_created`, or `shipment_recreated` fires.\n\n' +
      'This endpoint is intentionally **public** — eKart calls it server-to-server with no JWT.\n\n' +
      '**Authenticity:** eKart signs the payload with your `EKART_WEBHOOK_SECRET` using HMAC-SHA256 (header: `x-ekart-signature`).\n\n' +
      '**Full URL:** `https://api.yourdomain.com/admin/shipments/ekart-webhook/receive`',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed.' })
  async receiveEkartWebhook(@Body() payload: any) {
    await this.shipmentService.handleEkartWebhook(payload);
    return { success: true };
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
@ApiTags('Admin - Shipments')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/shipments')
export class AdminShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  // ── LIST ALL ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all shipments with filters and pagination',
    description: '**Filters:** status, orderNumber, awbNumber, customerId.',
  })
  @ApiResponse({ status: 200, description: 'Paginated shipment list.' })
  async findAll(@Query() filters: AdminShipmentFilterDto) {
    const result = await this.shipmentService.findAll(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  // ── GET ONE ───────────────────────────────────────────────────────────────

  @Get(':orderId')
  @ApiOperation({ summary: 'Get shipment for a specific order' })
  @ApiParam({ name: 'orderId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Shipment found.' })
  @ApiResponse({ status: 404, description: 'Shipment not found.' })
  async findOne(@Param('orderId') orderId: string) {
    return successResponse(await this.shipmentService.findByOrderId(orderId));
  }

  // ── CREATE ────────────────────────────────────────────────────────────────

  @Post(':orderId/create')
  @ApiOperation({
    summary: 'Manually create shipment for an order',
    description: 'Normally triggered automatically after payment. Use for stuck orders.',
  })
  @ApiParam({ name: 'orderId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 201, description: 'Shipment created.' })
  async createShipment(@Param('orderId') orderId: string) {
    const shipment = await this.shipmentService.createShipment(orderId);
    return successResponse(shipment, { message: 'Shipment created successfully' });
  }

  // ── RETRY ─────────────────────────────────────────────────────────────────

  @Post(':orderId/retry')
  @ApiOperation({
    summary: 'Retry shipment creation for a failed/pending order',
    description: 'Deletes the failed Pending record and re-calls eKart create shipment.',
  })
  @ApiParam({ name: 'orderId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 201, description: 'Shipment retried.' })
  @ApiResponse({ status: 400, description: 'AWB already exists — nothing to retry.' })
  async retryCreation(@Param('orderId') orderId: string) {
    const shipment = await this.shipmentService.retryShipmentCreation(orderId);
    return successResponse(shipment, { message: 'Shipment creation retried' });
  }

  // ── TRACK (force refresh) ─────────────────────────────────────────────────

  @Post(':awbNumber/track')
  @ApiOperation({
    summary: 'Force-refresh tracking from eKart',
    description:
      'Calls eKart `GET /api/v1/track/{id}` and saves updated status to DB.\n\n' +
      '**When to use if webhook fails:** call this to manually pull the latest status.',
  })
  @ApiParam({ name: 'awbNumber', example: 'FMPC0123456789' })
  @ApiResponse({ status: 200, description: 'Tracking refreshed.' })
  async refreshTracking(@Param('awbNumber') awbNumber: string) {
    const shipment = await this.shipmentService.trackShipment(awbNumber);
    return successResponse(shipment, { message: 'Tracking refreshed' });
  }

  // ── CANCEL ────────────────────────────────────────────────────────────────

  @Delete(':awbNumber/cancel')
  @ApiOperation({
    summary: 'Cancel shipment on eKart',
    description:
      'Calls eKart `DELETE /api/v1/package/cancel?tracking_id={awb}`.\n\n' +
      'Only possible before pickup (Pending | Created | PickupScheduled).',
  })
  @ApiParam({ name: 'awbNumber', example: 'FMPC0123456789' })
  @ApiResponse({ status: 200, description: 'Shipment cancelled.' })
  @ApiResponse({ status: 400, description: 'Cannot cancel after pickup.' })
  async cancelShipment(@Param('awbNumber') awbNumber: string) {
    const shipment = await this.shipmentService.cancelShipment(awbNumber);
    return successResponse(shipment, { message: 'Shipment cancelled' });
  }

  // ── DOWNLOAD LABEL ────────────────────────────────────────────────────────

  @Post('label')
  @ApiOperation({
    summary: 'Download packing label PDF',
    description:
      'Calls eKart `POST /api/v1/package/label`.\n\n' +
      '**When to use:** Immediately after shipment is Created — print this label and stick it on the package before handing to courier.\n\n' +
      'Pass up to 100 AWB numbers in `ids`. Returns a PDF binary.\n\n' +
      'Set `?json_only=true` to get JSON metadata instead of PDF.',
  })
  @ApiQuery({ name: 'json_only', required: false, type: Boolean })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          example: ['FMPC0123456789'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'PDF label binary.' })
  async downloadLabel(
    @Body('ids') ids: string[],
    @Query('json_only') jsonOnly: string,
    @Res() res: Response,
  ) {
    const isJsonOnly = jsonOnly === 'true';
    const buffer = await this.shipmentService.downloadLabel(ids, isJsonOnly);

    if (isJsonOnly) {
      res.set('Content-Type', 'application/json');
      res.send(JSON.parse(buffer.toString()));
    } else {
      res.set({
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="label-${ids.join('-')}.pdf"`,
        'Content-Length':      buffer.length,
      });
      res.end(buffer);
    }
  }

  // ── DOWNLOAD MANIFEST ─────────────────────────────────────────────────────

  @Post('manifest')
  @ApiOperation({
    summary: 'Download manifest for pickup handover',
    description:
      'Calls eKart `POST /data/v2/generate/manifest`.\n\n' +
      '**When to use:** When the eKart pickup rider arrives at your warehouse — generate the manifest, sign it, and hand it over along with the packages.\n\n' +
      'Pass up to 100 AWB numbers in `ids`. Returns JSON with a manifest PDF URL.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          example: ['FMPC0123456789', 'FMPC0987654321'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Manifest JSON with PDF URL.' })
  async downloadManifest(@Body('ids') ids: string[]) {
    const result = await this.shipmentService.downloadManifest(ids);
    return successResponse(result);
  }

  // ── NDR ACTION ────────────────────────────────────────────────────────────

  @Post(':awbNumber/ndr')
  @ApiOperation({
    summary: 'Take NDR action on a failed delivery',
    description:
      'Calls eKart `POST /api/v2/package/ndr`.\n\n' +
      'Only applicable when shipment status is **DeliveryFailed**.\n\n' +
      '**Actions:**\n' +
      '- `Re-Attempt` — schedule another delivery. Send `date` (Unix ms timestamp).\n' +
      '- `RTO` — return the shipment to your warehouse. No extra fields needed.\n' +
      '- `Edit` — fix wrong address or phone. Send `address` **or** `phone` (10 digits).\n\n' +
      '**Typical flow:** Customer missed delivery → Re-Attempt. Customer cancels → RTO. Wrong address given → Edit.',
  })
  @ApiParam({ name: 'awbNumber', example: 'FMPC0123456789' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['action'],
      properties: {
        action:       { type: 'string', enum: ['Re-Attempt', 'RTO', 'Edit'], example: 'Re-Attempt' },
        date:         { type: 'number', example: 1700000000000, description: 'Re-attempt date (Unix ms). Required for Re-Attempt.' },
        address:      { type: 'string', example: '42, MG Road, Bengaluru', description: 'Updated address. Required for Edit (address or phone).' },
        phone:        { type: 'string', example: '9876543210', description: 'Updated phone (10 digits). Required for Edit (address or phone).' },
        instructions: { type: 'string', example: 'Call before delivery', description: 'Optional extra instructions.' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'NDR action submitted.' })
  @ApiResponse({ status: 400, description: 'Shipment not in DeliveryFailed status.' })
  async ndrAction(
    @Param('awbNumber') awbNumber: string,
    @Body() body: {
      action: 'Re-Attempt' | 'RTO' | 'Edit';
      date?: number;
      address?: string;
      phone?: string;
      instructions?: string;
    },
  ) {
    const { action, ...options } = body;
    const result = await this.shipmentService.handleNdr(awbNumber, action, options);
    return successResponse(result, { message: `NDR action "${action}" submitted` });
  }
}