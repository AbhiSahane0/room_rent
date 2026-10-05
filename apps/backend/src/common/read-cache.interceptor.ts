import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';

const SKIP = [/^\/documents\//, /^\/exports\//, /^\/auth\//, /^\/health/, /\/pdf(\?|$)/];
const READ_ONLY_POSTS = [/^\/bills\/preview/];

/**
 * Remembers the JSON answer of GET requests for a few seconds, per signed-in owner, so opening a screen again (or two devices
 * opening the same one) does not repeat the database work. Any write by that owner (POST/PUT/PATCH/DELETE) invalidates all of
 * their cached answers at once, so the app never shows data older than its own changes. Files, document links and anything
 * that records an audit entry are never cached. The TTL only matters for changes made outside the API (for example the import
 * script) or by another server instance.
 */
@Injectable()
export class ReadCacheInterceptor implements NestInterceptor {
  private readonly entries = new Map<string, { value: unknown; expires: number }>();
  private readonly versions = new Map<string, number>();

  constructor(private readonly ttlMs: number, private readonly maxEntries = 500) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.ttlMs <= 0 || context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.userId;
    if (!userId) return next.handle();
    const path: string = req.originalUrl ?? req.url;

    if (req.method !== 'GET') {
      if (req.method === 'HEAD' || req.method === 'OPTIONS' || (req.method === 'POST' && READ_ONLY_POSTS.some((r) => r.test(path)))) return next.handle();
      return next.handle().pipe(tap(() => this.versions.set(userId, (this.versions.get(userId) ?? 0) + 1)));
    }
    if (SKIP.some((r) => r.test(path))) return next.handle();

    const key = `${userId}|${this.versions.get(userId) ?? 0}|${path}`;
    const hit = this.entries.get(key);
    if (hit && hit.expires > Date.now()) return of(hit.value);
    return next.handle().pipe(
      tap((value) => {
        if (value instanceof StreamableFile) return;
        if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value as string);
        this.entries.set(key, { value, expires: Date.now() + this.ttlMs });
      }),
    );
  }
}
