import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Env } from '../common/env';

export const STORAGE = Symbol('STORAGE');

export interface SignedUrl {
  url: string;
  expiresAt: Date;
}

/** Private object storage. Nothing here ever returns a permanent public URL. */
export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Temporary URL that stops working after `ttlSeconds`. */
  signedUrl(key: string, opts: { ttlSeconds: number; fileName: string; contentType: string }): Promise<SignedUrl>;
  delete(key: string): Promise<void>;
}

@Injectable()
export class R2Storage implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    const accountId = config.get('R2_ACCOUNT_ID', { infer: true })!;
    this.bucket = config.get('R2_BUCKET_NAME', { infer: true })!;
    this.client = new S3Client({
      region: 'auto',
      forcePathStyle: true,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get('R2_ACCESS_KEY_ID', { infer: true })!,
        secretAccessKey: config.get('R2_SECRET_ACCESS_KEY', { infer: true })!,
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'private, no-store' }));
  }

  async signedUrl(key: string, opts: { ttlSeconds: number; fileName: string; contentType: string }): Promise<SignedUrl> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: opts.contentType,
        ResponseContentDisposition: `inline; filename="${opts.fileName.replace(/[^\w.\- ]/g, '_')}"`,
        ResponseCacheControl: 'private, no-store',
      }),
      { expiresIn: opts.ttlSeconds },
    );
    return { url, expiresAt: new Date(Date.now() + opts.ttlSeconds * 1000) };
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

/**
 * Development fallback used only when R2 is not configured (refused in production).
 * Files live on local disk and "signed URLs" are HMAC-signed, expiring links to the backend itself.
 */
@Injectable()
export class LocalDiskStorage implements StorageProvider {
  private readonly logger = new Logger('LocalDiskStorage');
  readonly root = path.resolve(process.cwd(), '.storage');
  private readonly secret: string;
  private readonly publicBase: string;

  constructor(config: ConfigService<Env, true>) {
    this.secret = config.get('JWT_SECRET', { infer: true });
    this.publicBase = process.env.PUBLIC_BASE_URL ?? `http://localhost:${config.get('PORT', { infer: true })}`;
    this.logger.warn('R2 is not configured - storing documents on local disk (development only)');
  }

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return full;
  }

  async put(key: string, body: Buffer, contentType: string) {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    await fs.writeFile(`${file}.meta`, contentType);
  }

  private sign(key: string, exp: number, name: string) {
    return createHmac('sha256', this.secret).update(`${key}|${exp}|${name}`).digest('hex');
  }

  async signedUrl(key: string, opts: { ttlSeconds: number; fileName: string; contentType: string }): Promise<SignedUrl> {
    const exp = Math.floor(Date.now() / 1000) + opts.ttlSeconds;
    const sig = this.sign(key, exp, opts.fileName);
    const qs = new URLSearchParams({ key, exp: String(exp), name: opts.fileName, sig });
    return { url: `${this.publicBase}/files/local?${qs}`, expiresAt: new Date(exp * 1000) };
  }

  /** Verifies a signed link and returns the file, or null when invalid or expired. */
  async readSigned(key: string, exp: number, name: string, sig: string) {
    if (!Number.isFinite(exp) || exp < Date.now() / 1000) return null;
    const expected = Buffer.from(this.sign(key, exp, name));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
      const file = this.resolve(key);
      return { body: await fs.readFile(file), contentType: await fs.readFile(`${file}.meta`, 'utf8') };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
    await fs.rm(`${this.resolve(key)}.meta`, { force: true });
  }
}
