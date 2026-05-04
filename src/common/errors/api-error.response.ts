export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  path: string;
  timestamp: string;
}

export function errorBody(
  statusCode: number,
  message: string | string[],
  path: string,
  error?: string,
): ApiErrorBody {
  return {
    success: false,
    statusCode,
    message,
    path,
    timestamp: new Date().toISOString(),
    ...(error !== undefined ? { error } : {}),
  };
}
