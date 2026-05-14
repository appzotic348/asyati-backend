import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize, IsArray, IsBoolean, IsEnum,
  IsOptional, IsString, IsUrl, MaxLength, MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination';
import { ShipmentStatus } from '../schemas/shipment.schema';


export class AdminShipmentFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ShipmentStatus, example: ShipmentStatus.IN_TRANSIT,
    description: 'Filter by shipment status.',
  })
  @IsOptional() @IsEnum(ShipmentStatus)
  status?: string;

  @ApiPropertyOptional({ example: 'ORD-20260505-00007' })
  @IsOptional() @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({ example: 'FMPC0123456789' })
  @IsOptional() @IsString()
  awbNumber?: string;

  @ApiPropertyOptional({ example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsOptional() @IsString()
  customerId?: string;
}


export enum EkartWebhookTopic {
  TRACK_UPDATED       = 'track_updated',
  SHIPMENT_CREATED    = 'shipment_created',
  SHIPMENT_RECREATED  = 'shipment_recreated',
}

export class RegisterWebhookDto {
  @ApiProperty({
    example: 'https://api.yourdomain.com/admin/shipments/ekart-webhook/receive',
    description:
      'Public URL that eKart will POST events to.\n\n' +
      'Must be HTTPS and publicly reachable. For local dev, use ngrok.',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    example: 'mySecret123',
    description:
      'Secret string (6–30 chars) that YOU define.\n\n' +
      'eKart uses this to sign webhook payloads with HMAC-SHA256.\n' +
      'Store this in `.env` as `EKART_WEBHOOK_SECRET` for verification.',
    minLength: 6,
    maxLength: 30,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  secret: string;

  @ApiProperty({
    enum:        EkartWebhookTopic,
    isArray:     true,
    example:     ['track_updated', 'shipment_created'],
    description:
      'Topics to subscribe to:\n\n' +
      '- `track_updated` — fires on every tracking scan (most useful)\n' +
      '- `shipment_created` — fires when shipment is manifested with AWB\n' +
      '- `shipment_recreated` — fires when a shipment is re-created (RTO reship)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(EkartWebhookTopic, { each: true })
  topics: Array<'track_updated' | 'shipment_created' | 'shipment_recreated'>;
}


export class UpdateWebhookDto {
  @ApiPropertyOptional({
    example: 'https://api.yourdomain.com/admin/shipments/ekart-webhook/receive',
  })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'newSecret456', minLength: 6, maxLength: 30 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  secret?: string;

  @ApiPropertyOptional({
    enum:    EkartWebhookTopic,
    isArray: true,
    example: ['track_updated'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(EkartWebhookTopic, { each: true })
  topics?: Array<'track_updated' | 'shipment_created' | 'shipment_recreated'>;

  @ApiPropertyOptional({
    example: true,
    description: 'Set to false to temporarily deactivate the webhook.',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}