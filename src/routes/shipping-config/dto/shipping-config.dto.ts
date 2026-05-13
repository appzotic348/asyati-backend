import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateShippingConfigDto {
  @ApiProperty({
    example: 79,
    description: 'Flat shipping charge in ₹. Set to 0 for always-free shipping.',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  shippingCharge: number;

  @ApiProperty({
    example: 799,
    description:
      'Orders whose subTotal is ≥ this value get free shipping. ' +
      'Set to 0 to make all orders free-shipping.',
  })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  freeShippingAbove: number;

  @ApiPropertyOptional({
    example: 'Revised for festive season',
    description: 'Optional internal note for this change.',
  })
  @IsOptional()
  @IsString()
  note?: string;
}