import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccess } from './api-success.response';

function isAlreadyWrapped(body: unknown): body is ApiSuccess<unknown> {
  return (
    body !== null &&
    typeof body === 'object' &&
    'success' in body &&
    (body as ApiSuccess).success === true
  );
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (isAlreadyWrapped(data)) return data;
        return { success: true as const, data };
      }),
    );
  }
}
