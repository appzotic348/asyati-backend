import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Query, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiBody, ApiConsumes,
  ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import {
  ApplyCouponDto, CreateCouponDto,
  FilterCouponsDto, UpdateCouponDto,
} from './dto/coupon.dto';
import { AdminJwtGuard }    from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard }       from '../../admin-auth/guards/roles.guard';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
import { GetUser }          from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse }  from '../../common/response';
import { PaginationDto }    from '../../common/pagination';
import { BadRequestException } from '@nestjs/common';


@ApiTags('Admin - Coupons')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/coupons')
export class AdminCouponController {
  constructor(private readonly couponService: CouponService) {}

  // ── CREATE ────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created.' })
  @ApiResponse({ status: 400, description: 'Validation error or code already exists.' })
  async create(@Body() dto: CreateCouponDto) {
    const coupon = await this.couponService.create(dto);
    return successResponse(coupon, { message: 'Coupon created successfully' });
  }

  // ── BULK UPLOAD ───────────────────────────────────────────────────────────

  @Post('bulk-upload')
  @ApiOperation({
    summary: 'Bulk create coupons from Excel',
    description: `
Upload an \`.xlsx\` or \`.xls\` file.

**Required columns:** Code, Discount Type, Discount Value, Start Date, End Date

**Optional columns:**
| Column | Values / Example |
|--------|-----------------|
| Description | 20% off on all products |
| Scope | All \| Category \| Department \| Product |
| Max Discount Amount | 500 |
| Min Order Value | 999 |
| Max Order Value | 0 (0 = no limit) |
| Total Usage Limit | 1000 |
| Per Customer Limit | 1 |
| First Time Only | true \| false |

**Discount Type values:** Percentage \| Flat \| FreeShipping

Dates must be valid date strings (e.g. 2025-01-01).
    `.trim(),
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Excel file (.xlsx or .xls)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Bulk upload complete.' })
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Excel file is required');
    const result = await this.couponService.createBulkFromExcel(file);
    return successResponse(result, {
      message: `Bulk upload complete: ${result.success} succeeded, ${result.failed} failed`,
    });
  }

  // ── LIST ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List coupons with filters and pagination' })
  async findAll(@Query() filters: FilterCouponsDto) {
    const result = await this.couponService.findAll(
      { page: filters.page, limit: filters.limit },
      filters,
    );
    return successResponse(result.data, { meta: result.meta as any });
  }

  // ── GET ONE ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.couponService.findById(id));
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    const coupon = await this.couponService.update(id, dto);
    return successResponse(coupon, { message: 'Coupon updated successfully' });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete coupon' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async remove(@Param('id') id: string) {
    await this.couponService.softDelete(id);
    return successResponse(null, { message: 'Coupon deleted successfully' });
  }

  // ── USAGE STATS ───────────────────────────────────────────────────────────

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get usage records for a coupon' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async getUsage(@Param('id') id: string, @Query() pagination: PaginationDto) {
    const result = await this.couponService.getUsageStats(id, pagination);
    return successResponse(result.data, { meta: result.meta as any });
  }
}


@ApiTags('Customer - Coupons')
@ApiBearerAuth('customer-access-token')
@UseGuards(CustomerJwtGuard)
@Controller('customer/coupons')
export class CustomerCouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  @ApiOperation({
    summary: 'Validate & preview coupon discount',
    description:
      'Checks if the coupon is valid for the customer\'s current cart and returns ' +
      'the discount amount and final total. Does NOT apply the coupon or create an order.',
  })
  @ApiResponse({ status: 201, description: 'Coupon valid. Returns discount preview.' })
  @ApiResponse({ status: 400, description: 'Invalid coupon, expired, or conditions not met.' })
  async validate(
    @Body() dto: ApplyCouponDto,
    @GetUser() customer: CustomerDocument,
  ) {
    const result = await this.couponService.validateCoupon(
      dto,
      (customer as any)._id.toString(),
    );
    return successResponse({
      couponId:       (result.coupon._id as any).toString(),
      code:           result.coupon.code,
      discountType:   result.coupon.discountType,
      discountValue:  result.coupon.discountValue,
      discountAmount: result.discountAmount,
      finalTotal:     result.finalTotal,
    });
  }
}