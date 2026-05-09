import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import {
  AddToWishlistDto,
  GuestAddToWishlistDto,
  GuestWishlistFilterDto,
  MergeWishlistDto,
  WishlistFilterDto,
} from './dto/wishlist.dto';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse } from '../../common/response';

@ApiTags('Customer - Wishlist')
@Controller('customer/wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('me')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Get wishlist — logged-in customer',
    description:
      'Returns paginated wishlist items.\n\n' +
      'Also refreshes `isAvailable` on each item based on current stock and listing status.\n\n' +
      '**Pagination:** omit `page` and `limit` to return all items.',
  })
  @ApiResponse({ status: 200, description: 'Wishlist returned.' })
  async getWishlistAuth(
    @GetUser() customer: CustomerDocument,
    @Query() filters: WishlistFilterDto,
  ) {
    const result = await this.wishlistService.getWishlistAuth(
      (customer as any)._id.toString(),
      filters,
    );
    return successResponse(result.data, { meta: result.meta as any });
  }


  @Get('guest')
  @ApiOperation({
    summary: 'Get wishlist — guest',
    description:
      'Returns (or creates) the guest wishlist identified by `guestId`.\n\n' +
      '**Pagination:** omit `page` and `limit` to return all items.',
  })
  @ApiQuery({ name: 'guestId', required: true,  example: 'guest_a1b2c3d4e5f6', description: 'UUID from browser localStorage.' })
  @ApiQuery({ name: 'page',    required: false, example: 1  })
  @ApiQuery({ name: 'limit',   required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Wishlist returned.' })
  @ApiResponse({ status: 400, description: 'guestId missing.' })
  async getWishlistGuest(
    @Query('guestId') guestId: string,
    @Query() filters: GuestWishlistFilterDto,
  ) {
    const result = await this.wishlistService.getWishlistGuest(guestId, filters);
    return successResponse(result.data, { meta: result.meta as any });
  }

  @Post('me/add')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Add product to wishlist — logged-in customer',
    description:
      'Adds the product to the wishlist.\n\n' +
      'If already wishlisted, silently skipped (idempotent — safe to call multiple times).',
  })
  @ApiResponse({ status: 201, description: 'Product added to wishlist.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async addItemAuth(
    @Body() dto: AddToWishlistDto,
    @GetUser() customer: CustomerDocument,
  ) {
    const wishlist = await this.wishlistService.addItemAuth(
      (customer as any)._id.toString(),
      dto,
    );
    return successResponse(wishlist, { message: 'Added to wishlist' });
  }

  @Post('guest/add')
  @ApiOperation({
    summary: 'Add product to wishlist — guest',
    description:
      'Adds the product to the guest wishlist.\n\n' +
      'Send both `productId` and `guestId` in the request body.',
  })
  @ApiResponse({ status: 201, description: 'Product added to wishlist.' })
  @ApiResponse({ status: 400, description: 'Missing guestId.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async addItemGuest(@Body() dto: GuestAddToWishlistDto) {
    const wishlist = await this.wishlistService.addItemGuest(dto);
    return successResponse(wishlist, { message: 'Added to wishlist' });
  }

  @Delete('me/item/:productId')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({ summary: 'Remove product from wishlist — logged-in customer' })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Product removed.' })
  @ApiResponse({ status: 404, description: 'Item not in wishlist.' })
  async removeItemAuth(
    @Param('productId') productId: string,
    @GetUser() customer: CustomerDocument,
  ) {
    const wishlist = await this.wishlistService.removeItemAuth(
      (customer as any)._id.toString(),
      productId,
    );
    return successResponse(wishlist, { message: 'Removed from wishlist' });
  }

  @Delete('guest/item/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist — guest' })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiQuery({ name: 'guestId', required: true, example: 'guest_a1b2c3d4e5f6' })
  @ApiResponse({ status: 200, description: 'Product removed.' })
  @ApiResponse({ status: 400, description: 'guestId missing.' })
  @ApiResponse({ status: 404, description: 'Item not in wishlist.' })
  async removeItemGuest(
    @Param('productId') productId: string,
    @Query('guestId') guestId: string,
  ) {
    const wishlist = await this.wishlistService.removeItemGuest(guestId, productId);
    return successResponse(wishlist, { message: 'Removed from wishlist' });
  }

  @Delete('me/clear')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({ summary: 'Clear entire wishlist — logged-in customer' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared.' })
  async clearWishlistAuth(@GetUser() customer: CustomerDocument) {
    await this.wishlistService.clearWishlistAuth((customer as any)._id.toString());
    return successResponse(null, { message: 'Wishlist cleared' });
  }

  @Delete('guest/clear')
  @ApiOperation({ summary: 'Clear entire wishlist — guest' })
  @ApiQuery({ name: 'guestId', required: true, example: 'guest_a1b2c3d4e5f6' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared.' })
  @ApiResponse({ status: 400, description: 'guestId missing.' })
  async clearWishlistGuest(@Query('guestId') guestId: string) {
    await this.wishlistService.clearWishlistGuest(guestId);
    return successResponse(null, { message: 'Wishlist cleared' });
  }

  @Get('me/check/:productId')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Check if product is wishlisted — logged-in customer',
    description: 'Returns `{ wishlisted: true/false }`.',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Result returned.' })
  async checkAuth(
    @Param('productId') productId: string,
    @GetUser() customer: CustomerDocument,
  ) {
    const wishlisted = await this.wishlistService.isWishlistedAuth(
      (customer as any)._id.toString(),
      productId,
    );
    return successResponse({ wishlisted });
  }

  @Get('guest/check/:productId')
  @ApiOperation({
    summary: 'Check if product is wishlisted — guest',
    description: 'Returns `{ wishlisted: true/false }`.',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiQuery({ name: 'guestId', required: true, example: 'guest_a1b2c3d4e5f6' })
  @ApiResponse({ status: 200, description: 'Result returned.' })
  async checkGuest(
    @Param('productId') productId: string,
    @Query('guestId') guestId: string,
  ) {
    const wishlisted = await this.wishlistService.isWishlistedGuest(guestId, productId);
    return successResponse({ wishlisted });
  }

  @Post('merge')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Merge guest wishlist into customer wishlist after login',
    description:
      '**Call immediately after a guest logs in or registers.**\n\n' +
      '1. Guest wishlists products → guestId wishlist created\n' +
      '2. Guest logs in → receives `accessToken`\n' +
      '3. Frontend calls this with Bearer token + `{ guestId }`\n' +
      '4. Guest items move into customer wishlist (duplicates skipped)\n' +
      '5. Guest wishlist deleted → frontend removes guestId from localStorage',
  })
  @ApiResponse({ status: 201, description: 'Wishlists merged.' })
  async mergeWishlist(
    @Body() dto: MergeWishlistDto,
    @GetUser() customer: CustomerDocument,
  ) {
    const wishlist = await this.wishlistService.mergeGuestWishlist(
      (customer as any)._id.toString(),
      dto,
    );
    return successResponse(wishlist, { message: 'Wishlist merged successfully' });
  }
}