export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export function successResponse<T>(
  data: T,
  options?: { message?: string; meta?: Record<string, unknown> },
): ApiSuccess<T> {
  const out: ApiSuccess<T> = { success: true, data };
  if (options?.message !== undefined) out.message = options.message;
  if (options?.meta !== undefined) out.meta = options.meta;
  return out;
}
