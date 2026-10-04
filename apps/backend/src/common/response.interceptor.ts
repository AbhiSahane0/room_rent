import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE } from './decorators';

/** Converts Prisma Decimals to plain numbers so clients never deal with strings. */
export function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return (value as Prisma.Decimal).toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) out[k] = serialize(v);
    return out;
  }
  return value;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const message = this.reflector.get<string | undefined>(RESPONSE_MESSAGE, context.getHandler());
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) return data;
        return { success: true, data: serialize(data) ?? null, ...(message ? { message } : {}) };
      }),
    );
  }
}
