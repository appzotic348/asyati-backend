import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, MergeCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { CustomerJwtGuard } from '../../customer-auth/guards/customer-jwt.guard';
// import { OptionalCustomerJwtGuard } from '../../customer-auth/guards/optional-customer-jwt.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CustomerDocument } from '../../customers/schemas/customer.schema';
import { successResponse } from '../../common/response';

/**
 * ─── CART FLOW OVERVIEW ────────────────────────────────────────────────────
 *
 *  GUEST (not logged in)
 *  ─────────────────────
 *  1. Frontend generates a UUID on first visit → stored in localStorage as "guestId".
 *  2. Every guest cart request passes guestId as a query param or body field.
 *  3. No Authorization header required.
 *  4. Guest carts auto-delete after 30 days (MongoDB TTL index on expiresAt).
 *
 *  LOGGED-IN CUSTOMER
 *  ──────────────────
 *  1. Include `Authorization: Bearer <token>` header.
 *  2. guestId is ignored for authenticated requests.
 *
 *  AFTER LOGIN / SIGNUP (merge flow)
 *  ──────────────────────────────────
 *  1. User browsed as guest and added items.
 *  2. User logs in → receives accessToken.
 *  3. Frontend calls POST /customer/cart/merge with Bearer token + { guestId }.
 *  4. Guest items transfer to the customer cart (quantities combined).
 *  5. Guest cart is deleted → frontend removes guestId from localStorage.
 *
 * ─────────────────────────────────────────────────────────────────────────-
 */
@ApiTags('Customer - Cart')
@Controller('customer/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ── GET CART (logged-in) ──────────────────────────────────────────────────

  @Get('me')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Get cart — logged-in customer',
    description: 'Returns (or creates) the cart for the authenticated customer.',
  })
  @ApiResponse({ status: 200, description: 'Cart retrieved.' })
  async getCartAuth(@GetUser() customer: CustomerDocument) {
    const cart = await this.cartService.getCart(
      (customer as any)._id.toString(),
    );
    return successResponse(cart);
  }

  // ── GET CART (guest) ──────────────────────────────────────────────────────

  @Get('guest')
  @ApiOperation({
    summary: 'Get cart — guest',
    description: 'Returns (or creates) the guest cart identified by `guestId`.',
  })
  @ApiQuery({
    name: 'guestId', required: true, example: 'guest_a1b2c3d4e5f6',
    description: 'UUID stored in browser localStorage.',
  })
  @ApiResponse({ status: 200, description: 'Cart retrieved.' })
  @ApiResponse({ status: 400, description: 'guestId missing.' })
  async getCartGuest(@Query('guestId') guestId: string) {
    const cart = await this.cartService.getCart(undefined, guestId);
    return successResponse(cart);
  }

  // ── ADD ITEM (logged-in) ──────────────────────────────────────────────────

  @Post('me/add')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Add item to cart — logged-in customer',
    description:
      'Adds the product to the customer cart and reserves stock immediately.\n\n' +
      'Adding the same product again **increases** the quantity.\n\n' +
      'Returns 400 if stock is insufficient.',
  })
  @ApiResponse({ status: 201, description: 'Item added.' })
  @ApiResponse({ status: 400, description: 'Insufficient stock.' })
  @ApiResponse({ status: 404, description: 'Product not found or inactive.' })
  async addItemAuth(
    @Body() dto: AddToCartDto,
    @GetUser() customer: CustomerDocument,
  ) {
    const cart = await this.cartService.addItem(
      dto,
      (customer as any)._id.toString(),
    );
    return successResponse(cart, { message: 'Item added to cart' });
  }

  // ── ADD ITEM (guest) ──────────────────────────────────────────────────────

  @Post('guest/add')
  @ApiOperation({
    summary: 'Add item to cart — guest',
    description:
      'Adds the product to the guest cart and reserves stock.\n\n' +
      'Send `guestId` in the request body.',
  })
  @ApiResponse({ status: 201, description: 'Item added.' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or missing guestId.' })
  @ApiResponse({ status: 404, description: 'Product not found or inactive.' })
  async addItemGuest(@Body() dto: AddToCartDto) {
    const cart = await this.cartService.addItem(dto);
    return successResponse(cart, { message: 'Item added to cart' });
  }

  // ── UPDATE ITEM QUANTITY (logged-in) ──────────────────────────────────────

  @Patch('me/item/:productId')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Update cart item quantity — logged-in customer',
    description:
      'Set `quantity` to **0** to remove the item.\n\n' +
      'Increasing reserves extra stock; decreasing releases the difference.',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Cart updated.' })
  @ApiResponse({ status: 400, description: 'Insufficient stock.' })
  @ApiResponse({ status: 404, description: 'Item not in cart.' })
  async updateItemAuth(
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
    @GetUser() customer: CustomerDocument,
  ) {
    const cart = await this.cartService.updateItem(
      productId,
      dto,
      (customer as any)._id.toString(),
    );
    return successResponse(cart, { message: 'Cart updated' });
  }

  // ── UPDATE ITEM QUANTITY (guest) ──────────────────────────────────────────

  @Patch('guest/item/:productId')
  @ApiOperation({
    summary: 'Update cart item quantity — guest',
    description:
      'Set `quantity` to **0** to remove the item.\n\n' +
      'Send `guestId` in the request body.',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Cart updated.' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or missing guestId.' })
  @ApiResponse({ status: 404, description: 'Item not in cart.' })
  async updateItemGuest(
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.updateItem(productId, dto);
    return successResponse(cart, { message: 'Cart updated' });
  }

  // ── REMOVE ITEM (logged-in) ───────────────────────────────────────────────

  @Delete('me/item/:productId')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Remove item from cart — logged-in customer',
    description: 'Removes the item and releases its reserved stock.',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiResponse({ status: 200, description: 'Item removed.' })
  @ApiResponse({ status: 404, description: 'Item not in cart.' })
  async removeItemAuth(
    @Param('productId') productId: string,
    @GetUser() customer: CustomerDocument,
  ) {
    const cart = await this.cartService.removeItem(
      productId,
      (customer as any)._id.toString(),
    );
    return successResponse(cart, { message: 'Item removed from cart' });
  }

  // ── REMOVE ITEM (guest) ───────────────────────────────────────────────────

  @Delete('guest/item/:productId')
  @ApiOperation({
    summary: 'Remove item from cart — guest',
    description: 'Removes the item and releases its reserved stock.',
  })
  @ApiParam({ name: 'productId', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @ApiQuery({ name: 'guestId', required: true, example: 'guest_a1b2c3d4e5f6' })
  @ApiResponse({ status: 200, description: 'Item removed.' })
  @ApiResponse({ status: 400, description: 'guestId missing.' })
  @ApiResponse({ status: 404, description: 'Item not in cart.' })
  async removeItemGuest(
    @Param('productId') productId: string,
    @Query('guestId') guestId: string,
  ) {
    const cart = await this.cartService.removeItem(productId, undefined, guestId);
    return successResponse(cart, { message: 'Item removed from cart' });
  }

  // ── CLEAR CART (logged-in) ────────────────────────────────────────────────

  @Delete('me/clear')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Clear entire cart — logged-in customer',
    description: 'Removes all items and releases all reserved stock.',
  })
  @ApiResponse({ status: 200, description: 'Cart cleared.' })
  async clearCartAuth(@GetUser() customer: CustomerDocument) {
    await this.cartService.clearCart((customer as any)._id.toString());
    return successResponse(null, { message: 'Cart cleared' });
  }

  // ── CLEAR CART (guest) ────────────────────────────────────────────────────

  @Delete('guest/clear')
  @ApiOperation({
    summary: 'Clear entire cart — guest',
    description: 'Removes all items and releases all reserved stock.',
  })
  @ApiQuery({ name: 'guestId', required: true, example: 'guest_a1b2c3d4e5f6' })
  @ApiResponse({ status: 200, description: 'Cart cleared.' })
  @ApiResponse({ status: 400, description: 'guestId missing.' })
  async clearCartGuest(@Query('guestId') guestId: string) {
    await this.cartService.clearCart(undefined, guestId);
    return successResponse(null, { message: 'Cart cleared' });
  }

  // ── MERGE GUEST CART AFTER LOGIN ──────────────────────────────────────────

  @Post('merge')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({
    summary: 'Merge guest cart into customer cart after login/register',
    description:
      '**Requires Bearer token.**\n\n' +
      'Call this immediately after a guest logs in or registers.\n\n' +
      '1. Guest adds items → guestId cart is created\n' +
      '2. Guest logs in/registers → receives `accessToken`\n' +
      '3. Frontend calls this endpoint with Bearer token + `{ guestId }`\n' +
      '4. Guest items move into the customer cart (quantities combined)\n' +
      '5. Guest cart is deleted → frontend removes guestId from localStorage',
  })
  @ApiResponse({ status: 201, description: 'Carts merged. Returns updated customer cart.' })
  async mergeCart(
    @Body() dto: MergeCartDto,
    @GetUser() customer: CustomerDocument,
  ) {
    const cart = await this.cartService.mergeGuestCart(
      (customer as any)._id.toString(),
      dto,
    );
    return successResponse(cart, { message: 'Cart merged successfully' });
  }
}