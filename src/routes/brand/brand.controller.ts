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
import { BrandService } from './brand.service';
import { CreateBrandDto, UpdateBrandDto, BrandFilterDto } from './dto/brand.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { successResponse } from '../../common/response';

@ApiTags('Admin - Brands')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @ApiOperation({ summary: 'Create brand' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateBrandDto })
  @ApiResponse({ status: 201, description: 'Brand created.' })
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Body() dto: CreateBrandDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return successResponse(
      await this.brandService.create(dto, logo),
      { message: 'Brand created successfully' },
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all brands' })
  async findAll(@Query() filters: BrandFilterDto) {
    const result = await this.brandService.findAll(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.brandService.findById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update brand' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateBrandDto })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @UseInterceptors(FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return successResponse(
      await this.brandService.update(id, dto, logo),
      { message: 'Brand updated successfully' },
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete brand' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async remove(@Param('id') id: string) {
    await this.brandService.remove(id);
    return successResponse(null, { message: 'Brand deleted successfully' });
  }
}