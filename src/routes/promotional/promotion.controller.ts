import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Query, UploadedFiles,
  UseGuards, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiBody, ApiConsumes,
  ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import {
  CreatePromotionDto, FetchActivePromotionsDto,
  FilterPromotionsDto, UpdatePromotionDto,
} from './dto/promotion.dto';
import { AdminJwtGuard }    from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard }       from '../../admin-auth/guards/roles.guard';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
import { GetUser }          from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse }  from '../../common/response';
import { PaginationDto }    from '../../common/pagination';


@ApiTags('Admin - Promotions')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/promotions')
export class AdminPromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  // ── CREATE ────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create a promotion (banner, popup, or strip)',
    description: `
Send as **multipart/form-data**.

**Types:**
- \`Banner\` — image-based promotional banner
- \`Popup\`  — modal overlay with optional delay and frequency controls
- \`Strip\`  — thin announcement bar (usually text/HTML content)

**Placements:** HomeHero, HomeMid, CategoryTop, ProductTop, CartSidebar, CheckoutTop,
Announcement, PopupGlobal, PopupHome, PopupExit

**Targeting:** All | Guest | LoggedIn | FirstTime

**Scheduling:** Set \`startDate\` / \`endDate\` for time-limited campaigns.
If omitted, promotion is always active while status = Active.

**Coupon tie-in:** Set \`couponCode\` to surface a copyable code on the banner/popup.
    `.trim(),
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreatePromotionDto })
  @ApiResponse({ status: 201, description: 'Promotion created.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image',       maxCount: 1 },
      { name: 'mobileImage', maxCount: 1 },
    ]),
  )
  async create(
    @Body() dto: CreatePromotionDto,
    @UploadedFiles() files: {
      image?:       Express.Multer.File[];
      mobileImage?: Express.Multer.File[];
    },
  ) {
    const promotion = await this.promotionService.create(
      dto,
      files?.image?.[0],
      files?.mobileImage?.[0],
    );
    return successResponse(promotion, { message: 'Promotion created successfully' });
  }

  // ── LIST ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List promotions with filters and pagination' })
  async findAll(@Query() filters: FilterPromotionsDto) {
    const result = await this.promotionService.findAll(
      { page: filters.page, limit: filters.limit },
      filters,
    );
    return successResponse(result.data, { meta: result.meta as any });
  }

  // ── GET ONE ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get promotion by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.promotionService.findById(id));
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update a promotion' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdatePromotionDto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image',       maxCount: 1 },
      { name: 'mobileImage', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @UploadedFiles() files: {
      image?:       Express.Multer.File[];
      mobileImage?: Express.Multer.File[];
    },
  ) {
    const promotion = await this.promotionService.update(
      id, dto,
      files?.image?.[0],
      files?.mobileImage?.[0],
    );
    return successResponse(promotion, { message: 'Promotion updated successfully' });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a promotion' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async remove(@Param('id') id: string) {
    await this.promotionService.softDelete(id);
    return successResponse(null, { message: 'Promotion deleted successfully' });
  }

  // ── REORDER ───────────────────────────────────────────────────────────────

  @Patch('reorder/bulk')
  @ApiOperation({
    summary: 'Bulk update sort order for promotions',
    description: 'Send an array of `{ id, sortOrder }` to reorder banners in a placement slot.',
  })
  async reorder(@Body() body: { items: { id: string; sortOrder: number }[] }) {
    if (!Array.isArray(body.items))
      throw new BadRequestException('items must be an array of { id, sortOrder }');
    await this.promotionService.reorder(body.items);
    return successResponse(null, { message: 'Sort order updated' });
  }
}


@ApiTags('Customer - Promotions')
@Controller('customer/promotions')
export class CustomerPromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get active promotions (banners, popups, strips)',
    description:
      'Returns all active, non-expired promotions. ' +
      'Filter by `placement` to fetch only the banners for a specific slot. ' +
      'If Bearer token is provided, target filtering respects LoggedIn/FirstTime rules.',
  })
  @ApiResponse({ status: 200, description: 'Active promotions.' })
  async getActive(
    @Query() query: FetchActivePromotionsDto,
    // Optional auth — works for both guests and logged-in customers
    @GetUser() customer?: CustomerDocument,
  ) {
    const customerId = customer ? (customer as any)._id?.toString() : undefined;
    const promotions = await this.promotionService.getActive(query, customerId);
    return successResponse(promotions);
  }
}