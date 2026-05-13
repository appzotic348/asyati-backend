import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { TaxGuideService } from './tax-guide.service';
import { CreateTaxGuideDto, UpdateTaxGuideDto, TaxGuideFilterDto } from './dto/tax-guide.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { successResponse } from '../../common/response';

@ApiTags('Admin - Tax Guides')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/tax-guides')
export class TaxGuideController {
  constructor(private readonly taxGuideService: TaxGuideService) {}

  @Post()
  @ApiOperation({ summary: 'Create tax guide' })
  async create(@Body() dto: CreateTaxGuideDto) {
    return successResponse(await this.taxGuideService.create(dto), {
      message: 'Tax guide created successfully',
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all tax guides' })
  async findAll(@Query() filters: TaxGuideFilterDto) {
    const result = await this.taxGuideService.findAll(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tax guide by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.taxGuideService.findById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tax guide' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaxGuideDto) {
    return successResponse(await this.taxGuideService.update(id, dto), {
      message: 'Tax guide updated',
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tax guide' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async remove(@Param('id') id: string) {
    await this.taxGuideService.remove(id);
    return successResponse(null, { message: 'Tax guide deleted' });
  }
}