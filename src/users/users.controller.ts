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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../admin-auth/guards/roles.guard';
import { Roles, SUPER_ADMIN_ROLE } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { PaginationDto } from '../common/pagination';
import { UserDocument } from '../users/schemas/user.schema';
import { successResponse } from '../common/response';

@ApiTags('Admin - Users')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({ summary: 'Create user — Super Admin only' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return successResponse(this.sanitize(user), {
      message: 'User created successfully',
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  async findAll(@Query() pagination: PaginationDto) {
    const result = await this.usersService.findAll(pagination);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current logged-in admin user' })
  async getMe(@GetUser() user: UserDocument) {
    const fullUser = await this.usersService.findById(
      (user as any)._id.toString(),
    );
    return successResponse(this.sanitize(fullUser));
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update own profile — username, password, mobileNumber only',
  })
  async updateMyProfile(
    @GetUser() user: UserDocument,
    @Body() dto: UpdateUserDto,
  ) {
    const updated = await this.usersService.updateMyProfile(
      (user as any)._id.toString(),
      dto,
    );
    return successResponse(this.sanitize(updated), {
      message: 'Profile updated successfully',
    });
  }

  @Get(':id')
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({ summary: 'Get user by ID — Super Admin only' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return successResponse(this.sanitize(user));
  }

  @Patch(':id')
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({
    summary:
      'Update any user profile — Super Admin only. Can update role (except superadmin). Email cannot be changed.',
  })
  async adminUpdateUser(
    @Param('id') id: string,
    @GetUser() requestingUser: UserDocument,
    @Body() dto: AdminUpdateUserDto,
  ) {
    const updated = await this.usersService.adminUpdateUser(
      id,
      dto,
      (requestingUser as any)._id.toString(),
    );
    return successResponse(this.sanitize(updated), {
      message: 'User updated successfully',
    });
  }

  @Delete(':id')
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({ summary: 'Soft delete user — Super Admin only' })
  async remove(
    @Param('id') id: string,
    @GetUser() requestingUser: UserDocument,
  ) {
    await this.usersService.softDelete(
      id,
      (requestingUser as any)._id.toString(),
    );
    return successResponse(null, { message: 'User deleted successfully' });
  }

  private sanitize(user: UserDocument) {
    const obj = user.toObject();
    delete obj.password;
    return obj;
  }
}