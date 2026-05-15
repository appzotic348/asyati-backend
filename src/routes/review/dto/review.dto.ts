import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum, IsInt, IsMongoId, IsNotEmpty,
  IsOptional, IsString, Max, Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination';
import { ReviewStatus } from '../schemas/review.schema';

const toInt = ({ value }: { value: unknown }) =>
  value !== undefined && value !== '' ? parseInt(String(value), 10) : undefined;

export class CreateReviewDto {
  @ApiProperty({ example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsMongoId()
  productId: string;

  @ApiPropertyOptional({
    example: '775f1a2b3c4d5e6f7a8b9c0e',
    description: 'Variant ObjectId the customer received. Optional.',
  })
  @IsOptional() @IsMongoId()
  variantId?: string;

  @ApiProperty({ example: 5, description: 'Star rating: 1 (worst) to 5 (best).' })
  @Transform(toInt)
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Absolutely love this shirt!' })
  @IsOptional() @IsString() @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({
    example: 'The fabric is super soft and the fit is perfect. Highly recommend.',
  })
  @IsOptional() @IsString()
  body?: string;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4 })
  @IsOptional() @Transform(toInt) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  body?: string;
}

export class ModerateReviewDto {
  @ApiProperty({
    enum: [ReviewStatus.APPROVED, ReviewStatus.REJECTED],
    example: ReviewStatus.APPROVED,
    description: '`Approved` makes the review publicly visible. `Rejected` hides it.',
  })
  @IsEnum([ReviewStatus.APPROVED, ReviewStatus.REJECTED])
  status: ReviewStatus.APPROVED | ReviewStatus.REJECTED;

  @ApiPropertyOptional({
    example: 'Contains inappropriate language',
    description: 'Optional admin note visible only to admins.',
  })
  @IsOptional() @IsString()
  moderationNote?: string;
}

export class VoteReviewDto {
  @ApiProperty({ enum: ['helpful', 'notHelpful'] })
  @IsEnum(['helpful', 'notHelpful'])
  vote: 'helpful' | 'notHelpful';
}

export class FilterReviewsDto extends PaginationDto {
  @ApiPropertyOptional({ example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsOptional() @IsMongoId()
  productId?: string;

  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional() @IsEnum(ReviewStatus)
  status?: string;

  @ApiPropertyOptional({ example: 5, description: 'Filter by star rating.' })
  @IsOptional() @Transform(toInt) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'true = verified purchases only' })
  @IsOptional()
  isVerifiedPurchase?: boolean;

  @ApiPropertyOptional({ enum: ['rating', 'helpfulCount', 'createdAt'] })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional() @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class CustomerReviewFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 4, description: 'Filter by star rating (1–5).' })
  @IsOptional() @Transform(toInt) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'true = verified purchases only' })
  @IsOptional()
  isVerifiedPurchase?: boolean;

  @ApiPropertyOptional({
    enum: ['rating', 'helpfulCount', 'createdAt'],
    description: 'Sort field. Default: createdAt.',
  })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Default: desc.' })
  @IsOptional() @IsString()
  sortOrder?: 'asc' | 'desc';
}