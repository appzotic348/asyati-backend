import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryFilterDto,
} from './dto/category.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { successResponse } from '../../common/response';

@ApiTags('Admin - Categories')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create category under a department' })
  @ApiResponse({ status: 201, description: 'Category created.' })
  async create(@Body() dto: CreateCategoryDto) {
    return successResponse(await this.categoryService.create(dto), {
      message: 'Category created successfully',
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all categories',
    description:
      'Filter by `departmentId` to get categories for a specific department.',
  })
  async findAll(@Query() filters: CategoryFilterDto) {
    const result = await this.categoryService.findAll(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.categoryService.findById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return successResponse(await this.categoryService.update(id, dto), {
      message: 'Category updated successfully',
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async remove(@Param('id') id: string) {
    await this.categoryService.remove(id);
    return successResponse(null, { message: 'Category deleted successfully' });
  }
}
