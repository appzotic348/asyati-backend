import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    example: 1,
    required: false,
    description: 'Page number (starts from 1). If not provided, returns all records.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @ApiProperty({
    example: 10,
    required: false,
    description: 'Number of records per page. If not provided, returns all records.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    totalPages: number | null;
    currentPage: number | null;
    perPage: number | null;
    hasPreviousPage: boolean | null;
    hasNextPage: boolean | null;
  };
}

export async function paginate<T>(
  model: any,
  filter: Record<string, unknown>,
  pagination: PaginationDto,
  sort: Record<string, 1 | -1> = { createdAt: -1 },
): Promise<PaginatedResult<T>> {
  const total = await model.countDocuments(filter);

  // No pagination params → return all
  if (!pagination.page && !pagination.limit) {
    const data = await model.find(filter).sort(sort).lean();
    return {
      data,
      meta: {
        total,
        totalPages: null,
        currentPage: null,
        perPage: null,
        hasPreviousPage: null,
        hasNextPage: null,
      },
    };
  }

  const page  = pagination.page  ?? 1;
  const limit = pagination.limit ?? 10;
  const skip  = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  const data = await model.find(filter).sort(sort).skip(skip).limit(limit).lean();

  return {
    data,
    meta: {
      total,
      totalPages,
      currentPage: page,
      perPage: limit,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}