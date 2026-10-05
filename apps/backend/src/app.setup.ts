import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { Env } from './common/env';
import { ReadCacheInterceptor } from './common/read-cache.interceptor';
import { ResponseInterceptor } from './common/response.interceptor';
import { createValidationPipe } from './common/validation';

/** Shared by main.ts and the e2e tests so tests exercise the real pipeline. */
export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService<Env, true>);
  const origins = config.get('CORS_ORIGINS', { infer: true }).split(',').map((s) => s.trim()).filter(Boolean);

  // Swagger UI needs inline scripts/styles; the API itself keeps the strict default policy.
  const strict = helmet();
  const docs = helmet({ contentSecurityPolicy: false });
  app.use((req: { path: string }, res: unknown, next: () => void) => (/^\/docs(-json)?(\/|$)/.test(req.path) ? docs : strict)(req as never, res as never, next));
  // Everything this API returns is private owner data (bills, tenants, document links): never cache it.
  app.use((_req: unknown, res: { setHeader(k: string, v: string): void }, next: () => void) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  // Native apps send no Origin header and are unaffected by CORS; only listed web origins are allowed.
  app.enableCors({ origin: origins.length ? origins : false, credentials: false });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  // The cache is registered first, so it sees (and stores) the final response body. Off in tests unless READ_CACHE_MS is set explicitly.
  const cacheMs = Number(process.env.READ_CACHE_MS ?? (process.env.NODE_ENV === 'test' ? 0 : 20_000));
  app.useGlobalInterceptors(new ReadCacheInterceptor(cacheMs), new ResponseInterceptor(app.get(Reflector)));
  // Needed so rate limiting sees the real client IP behind a proxy. Never trust X-Forwarded-For when exposed directly.
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
}
