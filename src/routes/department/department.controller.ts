import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentFilterDto } from './dto/department.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { successResponse } from '../../common/response';

@ApiTags('Admin - Departments')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create department' })
  @ApiResponse({ status: 201, description: 'Department created.' })
  @ApiResponse({ status: 409, description: 'Department already exists.' })
  async create(@Body() dto: CreateDepartmentDto) {
    return successResponse(await this.departmentService.create(dto), {
      message: 'Department created successfully',
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all departments with search and pagination' })
  async findAll(@Query() filters: DepartmentFilterDto) {
    const result = await this.departmentService.findAll(filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async findOne(@Param('id') id: string) {
    return successResponse(await this.departmentService.findById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return successResponse(await this.departmentService.update(id, dto), {
      message: 'Department updated successfully',
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete department' })
  @ApiParam({ name: 'id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  async remove(@Param('id') id: string) {
    await this.departmentService.remove(id);
    return successResponse(null, { message: 'Department deleted successfully' });
  }
}