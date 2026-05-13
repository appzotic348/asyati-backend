import {
  BadRequestException,
  Body, Controller, Delete, Get, Param, Patch, Post,
  Query, UploadedFile, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation,
  ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { AddVariantDto, UpdateVariantDto } from './dto/variant.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { Roles, SUPER_ADMIN_ROLE } from '../../common/decorators/roles.decorator';
import { successResponse } from '../../common/response';

@ApiTags('Admin - Products')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ── CREATE ────────────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({
    summary: 'Create a product',
    description: `
Send as **multipart/form-data**.

**Images** — field order matters:
1. \`mainImage\` — required, single file
2. \`otherImageTypes\` — comma-separated labels **sent before otherImages** (FRONT|BACK|SIDE|DETAIL|LIFESTYLE)
3. \`otherImages\` — up to 5 files, positionally matched with otherImageTypes
4. \`mainPaletteImage\` — optional colour swatch

**Variants** — JSON string in \`variants\` field. Shipping dimensions are **per variant**:
\`\`\`json
[
  {"size":"M","color":"White","stock":30,"sku":"VH-M-WHT",
   "shipping":{"weightKg":0.25,"lengthCm":35,"breadthCm":28,"heightCm":5}},
  {"size":"XL","color":"White","stock":20,
   "shipping":{"weightKg":0.35,"lengthCm":42,"breadthCm":32,"heightCm":6}}
]
\`\`\`

**Comma-separated fields**: searchKeywords, keyFeatures, metaKeywords
    `.trim(),
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 409, description: 'SKU already exists.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mainImage',        maxCount: 1 },
      { name: 'otherImages',      maxCount: 5 },
      { name: 'mainPaletteImage', maxCount: 1 },
    ]),
  )
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: {
      mainImage?:        Express.Multer.File[];
      otherImages?:      Express.Multer.File[];
      mainPaletteImage?: Express.Multer.File[];
    },
  ) {
    if (!files?.mainImage?.[0])
      throw new BadRequestException('mainImage is required');
    if ((files.otherImages?.length ?? 0) > 5)
      throw new BadRequestException('otherImages accepts a maximum of 5 images');

    const product = await this.productsService.create(
      dto,
      files.mainImage[0],
      files.otherImages ?? [],
      files.mainPaletteImage?.[0],
    );
    return successResponse(product, { message: 'Product created successfully' });
  }

  // ── BULK UPLOAD ───────────────────────────────────────────────────────────
  @Post('bulk-upload')
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({
    summary: 'Bulk create products from Excel — Super Admin only',
    description: `
Upload an \`.xlsx\` or \`.xls\` file.

**Required columns:** Seller SKU ID, MRP (INR), Selling Price (INR), Brand, Name, Department, Category

**Variant columns** (use \`::\` separator for multiple values):
| Column | Example |
|--------|---------|
| Size   | \`XS::S::M::L\` |
| Color  | \`Blue::Blue::Blue::Blue\` |
| Stock  | \`10::20::25::15\` |

**Per-variant shipping columns** (same \`::\` separator — positionally matched to variants):
| Column | Example |
|--------|---------|
| Weight (KG) | \`0.20::0.25::0.28::0.32\` |
| Length (CM) | \`33::35::38::40\` |
| Breadth (CM)| \`28::28::30::30\` |
| Height (CM) | \`5::5::6::6\` |

**Image columns** (separate columns per image — up to 5):
| Column | Example |
|--------|---------|
| Main Image URL | \`https://cdn.../main.jpg\` |
| Other Image 1 URL | \`https://cdn.../front.jpg\` |
| Other Image 1 Type | \`FRONT\` |
| Other Image 2 URL | \`https://cdn.../back.jpg\` |
| Other Image 2 Type | \`BACK\` |
| Other Image 3 URL | \`https://cdn.../side.jpg\` |
| Other Image 3 Type | \`SIDE\` |
| Other Image 4 URL | ... |
| Other Image 4 Type | ... |
| Other Image 5 URL | ... |
| Other Image 5 Type | ... |

**SEO columns:** Meta Title, Meta Description, Meta Keywords (comma-separated)

**Dynamic metadata:** Any other column header becomes metadata key/value.

Products default to \`listingStatus: Inactive\`.
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
  @ApiResponse({ status: 400, description: 'No file or empty Excel.' })
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Excel file is required');
    const result = await this.productsService.createBulkFromExcel(file);
    return successResponse(result, {
      message: `Bulk upload complete: ${result.success} succeeded, ${result.failed} failed`,
    });
  }

  // ── GET ALL ───────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List products with filters, search, sort and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated product list.' })
  async findAll(@Query() filters: FilterProductsDto) {
    const result = await this.productsService.findAll(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  // ── GET ONE ───────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Product found.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.productsService.findById(id));
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({
    summary: 'Update product',
    description: `
All fields optional. Send as **multipart/form-data**.

**Images** — send \`addOtherImageTypes\` BEFORE \`addOtherImages\`.

**Note:** Shipping dimensions are managed per-variant via \`PATCH /admin/products/:id/variants/:variantId\`.
\`sellerSkuId\` cannot be changed.
    `.trim(),
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mainImage',        maxCount: 1 },
      { name: 'addOtherImages',   maxCount: 5 },
      { name: 'mainPaletteImage', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: {
      mainImage?:        Express.Multer.File[];
      addOtherImages?:   Express.Multer.File[];
      mainPaletteImage?: Express.Multer.File[];
    },
  ) {
    const product = await this.productsService.update(
      id, dto,
      files?.mainImage?.[0],
      files?.addOtherImages,
      files?.mainPaletteImage?.[0],
    );
    return successResponse(product, { message: 'Product updated successfully' });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  @Delete(':id')
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({ summary: 'Soft delete product — Super Admin only' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Product deleted.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async remove(@Param('id') id: string) {
    await this.productsService.softDelete(id);
    return successResponse(null, { message: 'Product deleted successfully' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VARIANT MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  // ── ADD VARIANT ───────────────────────────────────────────────────────────
  @Post(':id/variants')
  @ApiOperation({
    summary: 'Add a new variant to a product',
    description: `
Adds one variant. A corresponding per-variant Inventory record is created automatically.

Shipping dimensions (weightKg, lengthCm, breadthCm, heightCm) are part of the variant body.
    `.trim(),
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 201, description: 'Variant added.' })
  @ApiResponse({ status: 400, description: 'Duplicate size+color combination.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async addVariant(
    @Param('id') id: string,
    @Body() dto: AddVariantDto,
  ) {
    const product = await this.productsService.addVariant(id, dto);
    return successResponse(product, { message: 'Variant added successfully' });
  }

  // ── UPDATE VARIANT ────────────────────────────────────────────────────────
  @Patch(':id/variants/:variantId')
  @ApiOperation({
    summary: 'Update an existing variant',
    description: `
Partial update — only supplied fields are changed.

Includes shipping dimensions. If size or color changes, the inventory record is updated to match.
    `.trim(),
  })
  @ApiParam({ name: 'id',        example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiParam({ name: 'variantId', example: '775f1a2b3c4d5e6f7a8b9c0e' })
  @ApiResponse({ status: 200, description: 'Variant updated.' })
  @ApiResponse({ status: 404, description: 'Product or variant not found.' })
  async updateVariant(
    @Param('id')        id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    const product = await this.productsService.updateVariant(id, variantId, dto);
    return successResponse(product, { message: 'Variant updated successfully' });
  }

  // ── DELETE VARIANT ────────────────────────────────────────────────────────
  @Delete(':id/variants/:variantId')
  @ApiOperation({
    summary: 'Remove a variant from a product',
    description: 'Removes the variant and deletes its Inventory record.',
  })
  @ApiParam({ name: 'id',        example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiParam({ name: 'variantId', example: '775f1a2b3c4d5e6f7a8b9c0e' })
  @ApiResponse({ status: 200, description: 'Variant removed.' })
  @ApiResponse({ status: 404, description: 'Product or variant not found.' })
  async removeVariant(
    @Param('id')        id: string,
    @Param('variantId') variantId: string,
  ) {
    const product = await this.productsService.removeVariant(id, variantId);
    return successResponse(product, { message: 'Variant removed successfully' });
  }
}