import {
  Body, Controller, Get, Param, Patch, Delete, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { UpdateVariantStockDto, InventoryFilterDto } from './dto/inventory.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { successResponse } from '../../common/response';

@ApiTags('Admin - Inventory')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── GET ALL (paginated, filterable) ───────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get all inventory records (one per variant)',
    description:
      'Filter by `productId`, `search` (SKU / product name / variant title), ' +
      'or `lowStock=true` (stock < 10).',
  })
  async findAll(@Query() filters: InventoryFilterDto) {
    const result = await this.inventoryService.findAll(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  // ── GET ALL VARIANTS FOR A PRODUCT ────────────────────────────────────────
  @Get(':productId')
  @ApiOperation({ summary: 'Get all variant inventory records for a product' })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async findByProduct(@Param('productId') productId: string) {
    return successResponse(
      await this.inventoryService.findByProductId(productId),
    );
  }

  // ── GET ONE VARIANT INVENTORY ─────────────────────────────────────────────
  @Get(':productId/variant/:variantId')
  @ApiOperation({ summary: 'Get inventory for a specific variant' })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiParam({ name: 'variantId', example: '775f1a2b3c4d5e6f7a8b9c0e' })
  async findOne(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return successResponse(
      await this.inventoryService.findByVariantId(productId, variantId),
    );
  }

  // ── UPDATE STOCK FOR ONE VARIANT ──────────────────────────────────────────
  @Patch(':productId/variant/:variantId')
  @ApiOperation({
    summary: 'Set stock for a specific variant',
    description: 'Provide an absolute `stock` value. Reserved quantity is unchanged.',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiParam({ name: 'variantId', example: '775f1a2b3c4d5e6f7a8b9c0e' })
  @ApiResponse({ status: 200, description: 'Variant stock updated.' })
  @ApiResponse({ status: 404, description: 'Inventory record not found.' })
  async updateStock(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantStockDto,
  ) {
    const inv = await this.inventoryService.updateVariantStock(
      productId, variantId, dto.stock,
    );
    return successResponse(inv, { message: 'Variant stock updated' });
  }
}