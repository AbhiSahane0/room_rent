import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { Env } from './common/env';
import { ResponseInterceptor } from './common/response.interceptor';
import { createValidationPipe } from './common/validation';

/** Shared by main.ts and the e2e tests so tests exercise the real pipeline. */
export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService<Env, true>);
  const origins = config.get('CORS_ORIGINS', { infer: true }).split(',').map((s) => s.trim()).filter(Boolean);

  app.use(helmet());
  // Native apps send no Origin header and are unaffected by CORS; only listed web origins are allowed.
  app.enableCors({ origin: origins.length ? origins : false, credentials: false });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.set('trust proxy', 1);
}
