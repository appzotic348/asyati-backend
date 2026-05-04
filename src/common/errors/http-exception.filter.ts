import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { errorBody } from './api-error.response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        if (Array.isArray(body.message)) {
          message = body.message as string[];
        } else if (typeof body.message === 'string') {
          message = body.message;
        } else if (typeof body.error === 'string') {
          message = body.error;
        }
        if (typeof body.error === 'string') errorName = body.error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack ?? exception.message);
    } else {
      this.logger.error('Unhandled exception', exception as object);
    }

    const payload = errorBody(
      status,
      message,
      request.url ?? '',
      errorName ?? HttpStatus[status],
    );

    response.status(status).json(payload);
  }
}
