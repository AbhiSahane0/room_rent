import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/** Every error leaves the API as { success:false, message, errors? } - never a stack trace. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      if (typeof body === 'string') message = body;
      else {
        if (body.errors) errors = body.errors;
        message = Array.isArray(body.message) ? body.message[0] : body.message ?? exception.message;
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS) message = 'Too many requests. Please wait a moment and try again.';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with the same details already exists';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        case 'P2003':
          status = HttpStatus.CONFLICT;
          message = 'This record is linked to other data and cannot be changed this way';
          break;
        default:
          this.logger.error(`Database error ${exception.code}`);
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid request';
    } else if (exception instanceof Error && /immutable|cannot be modified/i.test(exception.message)) {
      // Raised by database triggers protecting historical records
      status = HttpStatus.CONFLICT;
      message = 'Historical records cannot be modified';
    } else {
      this.logger.error(exception instanceof Error ? `${exception.name}: ${exception.message}` : 'Unknown error');
    }

    res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
  }
}
