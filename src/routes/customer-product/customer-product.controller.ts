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
      'Returns only Active products that have a main image.\n\n' +
      '**Filters:** brand, idealFor, sleeveLength, pattern, fabric, topType, bottomType, ' +
      'additionalGarments, size, color, occasion, kurtaStyleType, neck, trend, sleeveStyle, ' +
      'topLength, dupattalIncluded, coOrdSet, priceMin, priceMax.\n\n' +
      '**Search:** `search` param — case-insensitive match across brand, styleCode, description, ' +
      'searchKeywords, keyFeatures.\n\n' +
      '**Sort:** `sortBy` (sellingPrice | mrp | createdAt) + `sortOrder` (asc | desc). Default: newest first.\n\n' +
      '**Pagination:** omit `page` and `limit` to return all records.',
  })
  @ApiResponse({ status: 200, description: 'Paginated product list.' })
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
  @ApiQuery({ name: 'page',  required: false, example: 1,  description: 'Page number (starts from 1). Omit to return all.' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Items per page. Omit to return all.' })
  @ApiResponse({ status: 200, description: 'New arrivals list.' })
  async newArrivals(@Query() pagination: PaginationDto) {
    const result = await this.customerProductService.findNewArrivals(pagination);
    return successResponse(result.data, { meta: result.meta });
  }


  @Get('occasion/:occasion')
  @ApiOperation({
    summary: 'Get products by occasion',
    description:
      '**Public.** Returns all active products for a given occasion.\n\n' +
      'Allowed values: `Casual` | `Festive & Party` | `Formal` | `Wedding`\n\n' +
      '**Pagination:** omit `page` and `limit` to return all records.',
  })
  @ApiParam({
    name: 'occasion',
    example: 'Wedding',
    description: 'Occasion name — must match exactly: Casual | Festive & Party | Formal | Wedding',
  })
  @ApiQuery({ name: 'page',  required: false, example: 1,  description: 'Page number (starts from 1). Omit to return all.' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Items per page. Omit to return all.' })
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
      '**Public.** Returns all active products sharing the same `groupId`.\n\n' +
      'Use this to build a size picker — all variants of the same design are returned, ' +
      'sorted by size. Each variant is a separate product document with its own SKU, size, ' +
      'stock and images.',
  })
  @ApiParam({
    name: 'groupId',
    example: 'GRP-ANK-CTN-BLU',
    description: 'The groupId shared by all size/color variants of the same design.',
  })
  @ApiResponse({ status: 200, description: 'All active variants for this group.' })
  @ApiResponse({ status: 404, description: 'No active products found for this groupId.' })
  async byGroup(@Param('groupId') groupId: string) {
    const variants = await this.customerProductService.findByGroupId(groupId);
    return successResponse(variants);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product detail with size/color variants',
    description:
      '**Public.** Returns the requested product along with all other active variants ' +
      'sharing the same `groupId`.\n\n' +
      '**Response structure:**\n' +
      '```json\n' +
      '{\n' +
      '  "product": { ...full product fields... },\n' +
      '  "variants": [ { size: "S", ... }, { size: "L", ... } ]\n' +
      '}\n' +
      '```\n\n' +
      'If the product has no `groupId`, `variants` will be an empty array.',
  })
  @ApiParam({
    name: 'id',
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'MongoDB ObjectId of the product.',
  })
  @ApiResponse({ status: 200, description: 'Product detail with variants.' })
  @ApiResponse({ status: 404, description: 'Product not found or not active.' })
  async findOne(@Param('id') id: string) {
    const result = await this.customerProductService.findWithVariants(id);
    return successResponse(result);
  }

  @Get(':id/similar')
  @ApiOperation({
    summary: 'Get similar products (You may also like)',
    description:
      '**Public.** Returns active products with the same `topType` and `bottomType` as ' +
      'the given product.\n\n' +
      'Products from the same group (same `groupId`) are excluded to avoid showing variants.\n\n' +
      'Default limit: 8. Maximum: 20.',
  })
  @ApiParam({
    name: 'id',
    example: '665f1a2b3c4d5e6f7a8b9c0d',
    description: 'MongoDB ObjectId of the product to find similar items for.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 8,
    description: 'Max number of similar products to return. Default: 8, max: 20.',
  })
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