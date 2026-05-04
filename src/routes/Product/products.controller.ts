import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { Roles, SUPER_ADMIN_ROLE } from '../../common/decorators/roles.decorator';
import { FilterProductsDto } from './dto/filter-products.dto';
import { successResponse } from '../../common/response';

@ApiTags('Admin - Products')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}


  @Post()
  @ApiOperation({
    summary: 'Create a single product with images',
    description:
      '**Any authenticated admin user.**\n\n' +
      'Send as `multipart/form-data`.\n\n' +
      '**Array fields** (itemsIncluded, pattern, fabric, color, occasion, etc.) — ' +
      'send as a **comma-separated string**: `"Blue,Gold"`. ' +
      'fabric accepts **maximum 2 values**.\n\n' +
      '**Boolean fields** (dupattalIncluded, coOrdSet, lining) — send as `"true"` or `"false"`.\n\n' +
      '**Number fields** — send as numeric strings e.g. `"1999"`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error, missing mainImage, or more than 5 otherImages.' })
  @ApiResponse({ status: 409, description: 'Seller SKU ID already exists.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mainImage', maxCount: 1 },
      { name: 'otherImages', maxCount: 5 },
      { name: 'mainPaletteImage', maxCount: 1 },
    ]),
  )
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles()
    files: {
      mainImage?: Express.Multer.File[];
      otherImages?: Express.Multer.File[];
      mainPaletteImage?: Express.Multer.File[];
    },
  ) {
    if (!files?.mainImage?.[0]) {
      throw new BadRequestException('mainImage is required');
    }
    const otherFiles = files.otherImages || [];
    if (otherFiles.length > 5) {
      throw new BadRequestException('otherImages accepts a maximum of 5 images');
    }
    const product = await this.productsService.create(
      dto,
      files.mainImage[0],
      otherFiles,
      files?.mainPaletteImage?.[0],
    );
    return successResponse(product, { message: 'Product created successfully' });
  }

  @Post('bulk-upload')
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({
    summary: 'Bulk create products from Flipkart-format Excel — Super Admin only',
    description:
      'Upload the Flipkart ethnic-set catalog Excel file (`.xlsx` or `.xls`).\n\n' +
      '**Required columns:** Seller SKU ID, MRP (INR), Your selling price (INR), Brand, ' +
      'Items Included, Ideal For, Sleeve Length, Pattern, Fabric, Top Type, Bottom Type, Size, Style Code, Color\n\n' +
      'Multi-value columns (Pattern, Fabric, Color, etc.) use `::` as separator in the Excel.\n\n' +
      'Images are not bulk-uploaded — use `PATCH /admin/products/:id` to add images afterwards.\n\n' +
      'New products default to `listingStatus: Inactive`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Flipkart ethnic-set Excel (.xlsx or .xls).' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Bulk upload complete.' })
  @ApiResponse({ status: 400, description: 'No file or empty Excel.' })
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Excel file is required');
    const result = await this.productsService.createBulkFromExcel(file);
    return successResponse(result, {
      message: `Bulk upload complete: ${result.success} succeeded, ${result.failed} failed`,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all products with filters, search, sort and pagination',
    description:
      '**Any authenticated admin user.**\n\n' +
      '**Filters:** listingStatus, brand, idealFor, sleeveLength, pattern, fabric, topType, bottomType, ' +
      'additionalGarments, size, color, occasion, kurtaStyleType, neck, trend, sleeveStyle, topLength, ' +
      'dupattalIncluded, coOrdSet, mrpMin, mrpMax, sellingPriceMin, sellingPriceMax.\n\n' +
      '**Search:** `search` param does case-insensitive partial match across brand, sellerSkuId, styleCode, description, searchKeywords.\n\n' +
      '**Sort:** `sortBy` (mrp | sellingPrice | stock | createdAt | brand) + `sortOrder` (asc | desc). Default: createdAt desc.\n\n' +
      'All params are optional — omitting them returns all active products paginated.',
  })
  @ApiResponse({ status: 200, description: 'Filtered, sorted, paginated product list.' })
  async findAll(@Query() filters: FilterProductsDto) {
    const result = await this.productsService.findAll(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Product found.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.productsService.findById(id));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update product',
    description:
      '**Any authenticated admin user.** All fields optional.\n\n' +
      '**Main image:** uploading `mainImage` replaces the existing one (old deleted from Cloudinary).\n\n' +
      '**Other images — granular control:**\n' +
      '- `removeOtherImages` — comma-separated list of publicIds to **remove** (e.g. `"products/others/abc-123,products/others/def-456"`). Removal happens first.\n' +
      '- `addOtherImages` — new image file(s) to **add**. Added after removal. Total cannot exceed 5.\n' +
      '- Sending both in the same request is supported.\n\n' +
      '`sellerSkuId` cannot be changed.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error or too many images.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mainImage', maxCount: 1 },
      { name: 'addOtherImages', maxCount: 5 },
      { name: 'mainPaletteImage', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles()
    files: {
      mainImage?: Express.Multer.File[];
      addOtherImages?: Express.Multer.File[];
      mainPaletteImage?: Express.Multer.File[];
    },
  ) {
    const product = await this.productsService.update(
      id,
      dto,
      files?.mainImage?.[0],
      files?.addOtherImages,
      files?.mainPaletteImage?.[0],
    );
    return successResponse(product, { message: 'Product updated successfully' });
  }

  @Delete(':id')
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({
    summary: 'Soft delete product — Super Admin only',
    description: 'Sets `isDeleted: true`. Product disappears from all listings.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async remove(@Param('id') id: string) {
    await this.productsService.softDelete(id);
    return successResponse(null, { message: 'Product deleted successfully' });
  }
}