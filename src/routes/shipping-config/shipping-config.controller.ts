import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ShippingConfigService } from './shipping-config.service';
import { UpdateShippingConfigDto } from './dto/shipping-config.dto';
import { AdminJwtGuard } from '../../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../admin-auth/guards/roles.guard';
import { Roles, SUPER_ADMIN_ROLE } from '../../common/decorators/roles.decorator';
import { successResponse } from '../../common/response';

@ApiTags('Admin - Shipping Config')
@ApiBearerAuth('access-token')
@UseGuards(AdminJwtGuard, RolesGuard)
@Controller('admin/shipping-config')
export class ShippingConfigController {
  constructor(private readonly service: ShippingConfigService) {}

  // ── GET current config ────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get current shipping configuration',
    description:
      'Returns the active shipping charge and free-shipping threshold.\n\n' +
      'This config is used by the checkout service when computing order totals.',
  })
  @ApiResponse({ status: 200, description: 'Shipping config returned.' })
  async getConfig() {
    const cfg = await this.service.getConfig();
    return successResponse(cfg);
  }

  // ── UPDATE config (Super Admin only) ──────────────────────────────────────

  @Put()
  @Roles(SUPER_ADMIN_ROLE)
  @ApiOperation({
    summary: 'Update shipping configuration — Super Admin only',
    description:
      'Sets the flat `shippingCharge` (₹) and the `freeShippingAbove` threshold (₹).\n\n' +
      '**Example:** `shippingCharge: 79, freeShippingAbove: 799`\n' +
      '→ Orders below ₹799 get ₹79 shipping; orders ≥ ₹799 get free shipping.\n\n' +
      'Set `freeShippingAbove: 0` to make **all** orders free-shipping.\n\n' +
      'Set `shippingCharge: 0` to disable shipping charges entirely.',
  })
  @ApiResponse({ status: 200, description: 'Config updated.' })
  async updateConfig(@Body() dto: UpdateShippingConfigDto) {
    const cfg = await this.service.updateConfig(dto);
    return successResponse(cfg, { message: 'Shipping config updated' });
  }
}