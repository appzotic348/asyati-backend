import {
  BadRequestException,
  Body, Controller, Delete, Get, Param,
  Patch, Post, Query, UploadedFiles,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiBody, ApiConsumes,
  ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import {
  CreateReviewDto,
  CustomerReviewFilterDto,
  FilterReviewsDto,
  ModerateReviewDto,
  UpdateReviewDto,
  VoteReviewDto,
} from './dto/review.dto';
import { AdminJwtGuard }    from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard }       from '../../admin-auth/guards/roles.guard';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
import { GetUser }          from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse }  from '../../common/response';

@ApiTags('Admin - Reviews')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/reviews')
export class AdminReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({
    summary: 'List all reviews with filters',
    description:
      'Filter by `productId`, `status` (Pending / Approved / Rejected), `rating`, ' +
      '`isVerifiedPurchase`. Sort by `rating`, `helpfulCount`, or `createdAt`.',
  })
  async findAll(@Query() filters: FilterReviewsDto) {
    const result = await this.reviewService.findAll(
      { page: filters.page, limit: filters.limit },
      filters,
    );
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Patch(':id/moderate')
  @ApiOperation({
    summary: 'Approve or reject a review',
    description:
      '`Approved` → publicly visible on product page.\n\n' +
      '`Rejected` → hidden from customers. Add `moderationNote` for the internal reason.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Review moderated.' })
  async moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    const review = await this.reviewService.moderate(id, dto);
    return successResponse(review, { message: `Review ${dto.status.toLowerCase()}` });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hard delete a review (also removes Cloudinary images)' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async remove(@Param('id') id: string) {
    await this.reviewService.adminDelete(id);
    return successResponse(null, { message: 'Review deleted' });
  }
}

@ApiTags('Customer - Reviews')
@Controller('customer/reviews')
export class CustomerReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ── GET REVIEWS FOR A PRODUCT — public, no auth needed ───────────────────

  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get approved reviews for a product',
    description:
      '**Public — no login required. Guests and logged-in customers can both view.**\n\n' +
      'Returns approved reviews + rating summary (average, total, star breakdown).\n\n' +
      'Filter by `rating` (1–5) or `isVerifiedPurchase=true`. ' +
      'Sort by `rating`, `helpfulCount`, or `createdAt` (default).',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Reviews + rating summary.' })
  async findByProduct(
    @Param('productId') productId: string,
    @Query() filters: CustomerReviewFilterDto,
  ) {
    const { reviews, summary } = await this.reviewService.findByProduct(
      productId,
      filters,
    );
    // ✅ summary is nested inside meta to match successResponse type signature
    return successResponse(reviews.data, {
      meta: { ...(reviews.meta as Record<string, unknown>), summary },
    });
  }

  // ── RATING SUMMARY ONLY — public, no auth needed ─────────────────────────

  @Get('product/:productId/summary')
  @ApiOperation({
    summary: 'Get rating summary only (average + star breakdown)',
    description:
      '**Public — no login required.** Lightweight endpoint for the star badge ' +
      'on product cards without loading all review text.',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async summary(@Param('productId') productId: string) {
    const data = await this.reviewService.getRatingSummary(productId);
    return successResponse(data);
  }

  // ── SUBMIT REVIEW — requires login ────────────────────────────────────────

  @Post()
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Submit a product review',
    description:
      '**Requires login.**\n\n' +
      'Send as **multipart/form-data**. Up to **5 images** can be attached.\n\n' +
      'Verified purchase badge is set automatically if the customer has a Delivered order ' +
      'containing this product.\n\n' +
      'Reviews start as **Pending** and are visible only after admin approval.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Review submitted — awaiting moderation.' })
  @ApiResponse({ status: 400, description: 'Already reviewed this product.' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  async create(
    @Body() dto: CreateReviewDto,
    @GetUser() customer: CustomerDocument,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ) {
    if ((files?.images?.length ?? 0) > 5)
      throw new BadRequestException('You can attach a maximum of 5 images per review');

    const fullName =
      `${(customer as any).firstName ?? ''} ${(customer as any).lastName ?? ''}`.trim() ||
      (customer as any).email ||
      'Customer';

    const review = await this.reviewService.create(
      dto,
      (customer as any)._id.toString(),
      fullName,
      files?.images ?? [],
    );
    return successResponse(review, {
      message: 'Review submitted successfully. It will appear after moderation.',
    });
  }

  // ── UPDATE OWN REVIEW — requires login ────────────────────────────────────

  @Patch(':id')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Update your own review',
    description:
      '**Requires login.**\n\n' +
      'Send as **multipart/form-data**.\n\n' +
      'Add new images via `addImages` (max 5 total across existing + new).\n\n' +
      'Remove existing images by sending `removeImageIds` as a comma-separated ' +
      'list of Cloudinary `publicId` values.\n\n' +
      'Edited reviews are reset to **Pending** for re-moderation.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Review updated.' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'addImages', maxCount: 5 }]))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto & { removeImageIds?: string },
    @GetUser() customer: CustomerDocument,
    @UploadedFiles() files: { addImages?: Express.Multer.File[] },
  ) {
    const removePublicIds = dto.removeImageIds
      ? dto.removeImageIds.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const review = await this.reviewService.update(
      id,
      (customer as any)._id.toString(),
      dto,
      files?.addImages ?? [],
      removePublicIds,
    );
    return successResponse(review, { message: 'Review updated' });
  }

  // ── DELETE OWN REVIEW — requires login ────────────────────────────────────

  @Delete(':id')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({ summary: 'Delete your own review' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async deleteOwn(@Param('id') id: string, @GetUser() customer: CustomerDocument) {
    await this.reviewService.deleteOwn(id, (customer as any)._id.toString());
    return successResponse(null, { message: 'Review deleted' });
  }

  // ── VOTE ON A REVIEW — requires login ─────────────────────────────────────

  @Post(':id/vote')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Mark a review as helpful or not helpful',
    description: 'Send `{ "vote": "helpful" }` or `{ "vote": "notHelpful" }`.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async vote(@Param('id') id: string, @Body() dto: VoteReviewDto) {
    await this.reviewService.vote(id, dto.vote);
    return successResponse(null, { message: 'Vote recorded' });
  }
}