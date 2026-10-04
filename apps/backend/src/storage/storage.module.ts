import { Controller, Get, Global, NotFoundException, Query, Res, Inject, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Public } from '../common/decorators';
import { Env } from '../common/env';
import { LocalDiskStorage, R2Storage, STORAGE, StorageProvider } from './storage.service';

/** Serves development-only signed links. Not registered when R2 is configured. */
@Controller('files')
export class LocalFilesController {
  constructor(@Inject(STORAGE) private readonly storage: StorageProvider) {}

  @Public()
  @Get('local')
  async serve(@Query('key') key: string, @Query('exp') exp: string, @Query('name') name: string, @Query('sig') sig: string, @Res() res: Response) {
    if (!(this.storage instanceof LocalDiskStorage) || !key || !sig) throw new NotFoundException();
    const file = await this.storage.readSigned(key, Number(exp), name ?? '', sig);
    if (!file) throw new NotFoundException('This link has expired');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${(name ?? 'document').replace(/[^\w.\- ]/g, '_')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Helmet defaults to same-origin; the dev web preview loads this from another origin. The link is signed and short-lived.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(file.body);
  }
}

@Global()
@Module({
  controllers: [LocalFilesController],
  providers: [
    {
      provide: STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): StorageProvider => {
        const configured = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'].every((k) => !!config.get(k as keyof Env, { infer: true }));
        if (configured) return new R2Storage(config);
        if (config.get('NODE_ENV', { infer: true }) === 'production') {
          throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME are required in production');
        }
        return new LocalDiskStorage(config);
      },
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
