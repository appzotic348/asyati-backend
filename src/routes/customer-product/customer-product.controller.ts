import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { CustomerProductService } from './customer-product.service';
import { CustomerProductFilterDto } from './dto/customer-product-filter.dto';
import { PaginationDto } from '../../common/pagination';
import { successResponse } from '../../common/response';

@ApiTags('Customer - Products')
@Controller('customer/products')
export class CustomerProductController {
  constructor(private readonly customerProductService: CustomerProductService) {}

  @Get()
  @ApiOperation({
    summary: 'Browse all active products',
    description:
      '**Public endpoint — no login required.**\n\n' +
      'Returns only Active, non-deleted products that have a main image.\n\n' +
      '**Classification filters:** `departmentId`, `categoryId`\n\n' +
      '**Price filters:** `priceMin`, `priceMax` — matched against `variants[].pricing.sellingPrice`.\n\n' +
      '**Variant filters:** `size`, `color`.\n\n' +
      '**Metadata filter:** `metadata` — comma-separated `Key:Value` pairs.\n\n' +
      'Example: `metadata=Sleeve Length:Full Sleeve,Occasion:Wedding`\n\n' +
      '**Search:** `search` — case-insensitive match across name, styleCode, ' +
      'sellerSkuId, description, searchKeywords, keyFeatures.\n\n' +
      '**Sort:** `sortBy` (sellingPrice | mrp | createdAt) + `sortOrder` (asc | desc). ' +
      'Default: newest first.\n\n' +
      '**Pagination:** omit `page` and `limit` to return all records.\n\n' +
      '**Response shape:** each item is a `ProductCard` with pre-computed ' +
      '`pricing.discountPct`, `availableColors[]`, `availableSizes[]`, and ' +
      'populated `brand`, `department`, `category` objects — ready for direct render.',
  })
  @ApiResponse({ status: 200, description: 'Paginated product card list.' })
  async findAll(@Query() filters: CustomerProductFilterDto) {
    const result = await this.customerProductService.findAll(filters);
    return successResponse(result.data, { meta: result.meta });
  }


  @Get('new-arrivals')
  @ApiOperation({
    summary: 'Get new arrivals',
    description:
      '**Public.** Returns latest active products sorted by creation date descending.\n\n' +
      '**Pagination:** omit `page` and `limit` to return all records.',
  })
  @ApiQuery({ name: 'page',  required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'New arrivals list.' })
  async newArrivals(@Query() pagination: PaginationDto) {
    const result = await this.customerProductService.findNewArrivals(pagination);
    return successResponse(result.data, { meta: result.meta });
  }

  @Get('featured')
  @ApiOperation({
    summary: 'Get featured products',
    description:
      '**Public.** Returns active products where `visibility.isFeatured` is `true`, ' +
      'sorted newest first.',
  })
  @ApiQuery({ name: 'page',  required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Featured products list.' })
  async featured(@Query() pagination: PaginationDto) {
    const result = await this.customerProductService.findFeatured(pagination);
    return successResponse(result.data, { meta: result.meta });
  }

  @Get('occasion/:occasion')
  @ApiOperation({
    summary: 'Get products by occasion',
    description:
      '**Public.** Returns all active products whose `metadata` array contains ' +
      '`{ key: "Occasion", value: <occasion> }`.',
  })
  @ApiParam({ name: 'occasion', example: 'Wedding' })
  @ApiQuery({ name: 'page',  required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Products for the occasion.' })
  @ApiResponse({ status: 404, description: 'No products found for this occasion.' })
  async byOccasion(
    @Param('occasion') occasion: string,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.customerProductService.findByOccasion(occasion, pagination);
    return successResponse(result.data, { meta: result.meta });
  }

  @Get('group/:groupId')
  @ApiOperation({
    summary: 'Get all size/color variants of a product group',
    description:
      '**Public.** Returns all active products sharing the same `groupId`, sorted by name.',
  })
  @ApiParam({ name: 'groupId', example: 'GRP-ANK-CTN-BLU' })
  @ApiResponse({ status: 200, description: 'All active variants for this group.' })
  @ApiResponse({ status: 404, description: 'No active products found for this groupId.' })
  async byGroup(@Param('groupId') groupId: string) {
    const variants = await this.customerProductService.findByGroupId(groupId);
    return successResponse(variants);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product detail with group variants',
    description:
      '**Public.** Returns the full `ProductDetail` for the requested product ' +
      'plus lightweight `ProductCard[]` for all sibling products in the same group.\n\n' +
      '```json\n' +
      '{\n' +
      '  "product": { ...ProductDetail with variants[], otherImages[], keyFeatures[], ... },\n' +
      '  "variants": [ ...ProductCard[] of sibling colour/size options ]\n' +
      '}\n' +
      '```\n\n' +
      'Every variant inside `product.variants[]` carries its own `pricing.discountPct` ' +
      'and `inventory.available` so the frontend can grey-out out-of-stock options immediately.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Product detail with group variants.' })
  @ApiResponse({ status: 404, description: 'Product not found or not active.' })
  async findOne(@Param('id') id: string) {
    const result = await this.customerProductService.findWithVariants(id);
    return successResponse(result);
  }

  @Get(':id/similar')
  @ApiOperation({
    summary: 'Get similar products (You may also like)',
    description:
      '**Public.** Returns active products in the same department + category. ' +
      'Products from the same group are excluded. Default limit: 8, max: 20.',
  })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiQuery({ name: 'limit', required: false, example: 8 })
  @ApiResponse({ status: 200, description: 'Similar products list.' })
  @ApiResponse({ status: 404, description: 'Source product not found or not active.' })
  async similar(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    const products = await this.customerProductService.findSimilar(id, Number(limit) || 8);
    return successResponse(products);
  }
}