import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

type Doc = { tag: string; summary: string; description?: string; public?: boolean; query?: Record<string, string>; produces?: string };

const PUBLIC_PATHS = new Set(['/files/local', '/health', '/', '/health/db', '/auth/login', '/auth/refresh', '/auth/logout']);
const PDF = 'application/pdf';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Human text for every operation, keyed by "METHOD /path". Anything missing falls back to a generated title. */
const OPS: Record<string, Doc> = {
  'GET /health': { tag: 'Health', summary: 'Liveness check', description: 'Returns 200 whenever the process is up. No database call, no auth, never rate limited.' },
  'GET /': { tag: 'Health', summary: 'Liveness check (root)', description: 'Same as `/health`.' },
  'GET /health/db': { tag: 'Health', summary: 'Database check', description: 'Runs `SELECT 1`. Returns 503 if the database is unreachable.' },

  'POST /auth/login': { tag: 'Auth', summary: 'Log in', description: 'Username + password → access token (short lived) and refresh token. Limited to 8 requests/minute per IP.' },
  'POST /auth/refresh': { tag: 'Auth', summary: 'Refresh tokens', description: 'Exchanges a refresh token for a new pair; the old refresh token is revoked (rotation). 30/minute.' },
  'POST /auth/logout': { tag: 'Auth', summary: 'Log out', description: 'Revokes the given refresh token. Always succeeds.' },
  'GET /auth/me': { tag: 'Auth', summary: 'Current user' },
  'PATCH /auth/credentials': { tag: 'Auth', summary: 'Change username / password', description: 'Requires the current password.' },

  'GET /dashboard': { tag: 'Dashboard', summary: 'Home overview', description: 'Everything the Home screen shows in one call: collection, trend, dues (current and former tenants), rent roll, vacancy, pending payments, recent payments, tenants still to bill. Optional `propertyId` scopes to one property.', query: { propertyId: 'Limit to one property' } },

  'GET /properties': { tag: 'Properties', summary: 'List properties' },
  'POST /properties': { tag: 'Properties', summary: 'Create a property' },
  'GET /properties/{id}': { tag: 'Properties', summary: 'Get a property' },
  'PUT /properties/{id}': { tag: 'Properties', summary: 'Update a property', description: 'Includes bill settings: due day, UPI id, default rates.' },

  'GET /rooms': { tag: 'Rooms', summary: 'List rooms', description: 'Status is OCCUPIED exactly when the room has an ACTIVE assignment.' },
  'POST /rooms': { tag: 'Rooms', summary: 'Create a room' },
  'GET /rooms/{id}': { tag: 'Rooms', summary: 'Get a room' },
  'GET /rooms/{id}/history': { tag: 'Rooms', summary: 'Room stay history', description: 'Every tenant who has lived in the room, with their stay dates.' },
  'PUT /rooms/{id}': { tag: 'Rooms', summary: 'Update a room' },

  'GET /tenants': { tag: 'Tenants', summary: 'List tenants', description: 'Paginated. Filters: `status`, `search`, `dues=true` (owes money, including tenants who have left).' },
  'POST /tenants': { tag: 'Tenants', summary: 'Create a tenant' },
  'GET /tenants/{id}': { tag: 'Tenants', summary: 'Get a tenant', description: 'Includes current stay, balance and bills.' },
  'GET /tenants/{id}/electricity': { tag: 'Tenants', summary: 'Electricity history', description: 'Per-bill readings, units, rate and amount, plus a summary (average, highest, latest rate).' },
  'PUT /tenants/{id}': { tag: 'Tenants', summary: 'Update a tenant' },
  'DELETE /tenants/{id}': { tag: 'Tenants', summary: 'Delete a tenant (soft)', description: 'Blocked with 409 while the tenant still owes money or lives in a room.' },
  'GET /tenants/{id}/assignments': { tag: 'Tenants', summary: 'Tenant stays', description: 'All room assignments of the tenant, past and present.' },

  'POST /room-assignments': { tag: 'Assignments', summary: 'Move a tenant into a room', description: 'Creates an ACTIVE stay and marks the room occupied.' },
  'POST /room-assignments/{id}/move-out': { tag: 'Assignments', summary: 'Move a tenant out', description: 'Ends the stay and frees the room. Unpaid dues stay on the tenant and can be collected later.' },
  'POST /room-assignments/{id}/rent': { tag: 'Assignments', summary: 'Change rent', description: 'Takes effect from the given month; earlier bills are untouched.' },
  'POST /room-assignments/{id}/electricity': { tag: 'Assignments', summary: 'Change electricity rate', description: 'Per-unit rate for this stay. `applyToRoom` also makes it the room default.' },
  'GET /room-assignments/{id}/rent-history': { tag: 'Assignments', summary: 'Rent history' },
  'GET /room-assignments/{id}/charges': { tag: 'Assignments', summary: 'List recurring charges' },
  'POST /room-assignments/{id}/charges': { tag: 'Assignments', summary: 'Add a recurring charge' },
  'DELETE /room-assignments/{id}/charges/{chargeId}': { tag: 'Assignments', summary: 'Remove a recurring charge' },

  'GET /bills': { tag: 'Bills', summary: 'List bills', description: 'Paginated; filter by month, status, tenant, property.' },
  'POST /bills/preview': { tag: 'Bills', summary: 'Preview a bill', description: 'Computes lines, carried-forward balance and total without saving anything.' },
  'POST /bills': { tag: 'Bills', summary: 'Generate a bill', description: 'One live bill per stay per month. Bills are immutable once created; the previous unpaid balance is carried forward and marked on the old bill.' },
  'GET /bills/{id}': { tag: 'Bills', summary: 'Get a bill', description: 'Status is computed at read time (a past-due unpaid bill reads OVERDUE).' },
  'GET /bills/{id}/pdf': { tag: 'Bills', summary: 'Bill PDF', description: 'Always one page. `format`: `premium` (default, with UPI QR), `statement`, `invoice`. `download=1` sends it as an attachment. 40/minute.', produces: PDF, query: { download: '`1` to download instead of view inline', format: 'premium | statement | invoice' } },
  'POST /bills/{id}/cancel': { tag: 'Bills', summary: 'Cancel a bill', description: 'Cancelled bills are kept for audit; the balance they carried returns to the previous bill.' },
  'DELETE /bills/{id}': { tag: 'Bills', summary: 'Delete a bill', description: 'Only allowed when nothing has been paid against it.' },

  'POST /bills/{id}/payments': { tag: 'Payments', summary: 'Record a payment on a bill', description: 'Payments are append-only. Cannot exceed the balance due.' },
  'POST /payments': { tag: 'Payments', summary: 'Record a payment for a tenant', description: 'Applied to the tenant’s open bill.' },
  'GET /payments': { tag: 'Payments', summary: 'List payments', description: 'Paginated; filter by date range, method, tenant.' },
  'GET /tenants/{id}/open-bill': { tag: 'Payments', summary: 'Tenant’s open bill', description: 'The bill a payment would be applied to, or null.' },

  'POST /tenants/{tenantId}/documents': { tag: 'Documents', summary: 'Upload a document', description: 'multipart/form-data, field `file`. Stored privately in Cloudflare R2. 30/minute.' },
  'GET /tenants/{tenantId}/documents': { tag: 'Documents', summary: 'List a tenant’s documents' },
  'GET /documents/{id}/url': { tag: 'Documents', summary: 'Get a temporary download link', description: 'Pre-signed URL, valid for a few minutes.' },
  'DELETE /documents/{id}': { tag: 'Documents', summary: 'Delete a document' },

  'GET /reports/collection': { tag: 'Reports', summary: 'Collection report', description: 'Billed vs collected for a month, split by payment method, with a 6-month trend.' },
  'GET /reports/outstanding': { tag: 'Reports', summary: 'Outstanding dues', description: 'Who owes what, oldest first, current and former tenants.' },
  'GET /reports/occupancy': { tag: 'Reports', summary: 'Occupancy report' },

  'GET /files/local': { tag: 'Documents', summary: 'Local file download (development only)', description: 'Serves uploaded files when R2 is not configured. Requires a signed `token` query parameter.' },

  'GET /exports/excel': { tag: 'Exports', summary: 'Export everything to Excel', description: 'One `.xlsx` workbook: Summary, Tenant Ledger, Rooms, Tenants, Stays, Bills, Bill items, Payments, Electricity, Outstanding, Monthly. 10/minute.', produces: XLSX },
};

const TAG_TEXT: Record<string, string> = {
  Health: 'Uptime probes for Render / load balancers.',
  Auth: 'Login and token management.',
  Dashboard: 'Aggregated numbers for the Home screen.',
  Properties: 'Buildings and their billing settings.',
  Rooms: 'Rooms, shops and their status.',
  Tenants: 'People who rent (or rented) a room.',
  Assignments: 'A tenant’s stay in a room: move in/out, rent, electricity, recurring charges.',
  Bills: 'Monthly bills. Immutable once generated.',
  Payments: 'Append-only payment ledger.',
  Documents: 'Tenant KYC and agreement files.',
  Reports: 'Collection, dues and occupancy.',
  Exports: 'Data exports.',
};

const DESCRIPTION = `
REST API behind the Rent Manager web and mobile apps.

## Authentication
\`POST /auth/login\` returns \`accessToken\` + \`refreshToken\`. Send \`Authorization: Bearer <accessToken>\` on every other call. When it expires (401) call \`POST /auth/refresh\`; refresh tokens rotate, so store the new one. Use the **Authorize** button above to try endpoints here.

## Response envelope
Success: \`{ "success": true, "data": …, "message"?: string }\`
Error: \`{ "success": false, "message": string, "errors"?: [{ "field": string, "message": string }] }\`
(PDF and Excel endpoints return the raw file.) Money values are decimal strings/numbers in INR; dates are ISO 8601; billing months are \`YYYY-MM\`.

## Lists
List endpoints take \`page\` and \`limit\` and return \`{ items, total, page, limit }\` inside \`data\`.

## Money rules
Bills are immutable, payments are append-only, unpaid balance carries forward to the next bill, and a tenant who moves out keeps their dues until paid.

## Rate limits
Default 120 requests/minute per IP. Login 8, refresh 30, PDF 40, Excel export 10, document upload 30. Exceeding returns 429.

## Caching
GET responses may be served from a 20-second server cache; any write clears it. All responses are \`Cache-Control: private, no-store\`.
`;

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const cfg = new DocumentBuilder()
    .setTitle('Rent Manager API')
    .setDescription(DESCRIPTION.trim())
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .addSecurityRequirements('bearer');
  for (const [name, description] of Object.entries(TAG_TEXT)) cfg.addTag(name, description);
  const doc = SwaggerModule.createDocument(app, cfg.build());

  for (const [path, item] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(item as Record<string, any>)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const meta = OPS[`${method.toUpperCase()} ${path}`];
      op.tags = [meta?.tag ?? 'Other'];
      op.summary = meta?.summary ?? `${method.toUpperCase()} ${path}`;
      if (meta?.description) op.description = meta.description;
      if (PUBLIC_PATHS.has(path)) op.security = [];
      op.responses = { ...op.responses, '400': { description: 'Validation failed' }, ...(PUBLIC_PATHS.has(path) ? {} : { '401': { description: 'Missing or expired token' } }), '429': { description: 'Rate limit exceeded' } };
      if (meta?.query) {
        op.parameters = op.parameters ?? [];
        for (const [name, description] of Object.entries(meta.query)) {
          const p = op.parameters.find((x: any) => x.in === 'query' && x.name === name);
          if (p) p.description = description;
          else op.parameters.push({ name, in: 'query', required: false, description, schema: { type: 'string' } });
        }
      }
      if (meta?.produces) {
        const ok = op.responses['200'] ?? op.responses['201'] ?? (op.responses['200'] = { description: 'File' });
        ok.description = 'The file';
        ok.content = { [meta.produces]: { schema: { type: 'string', format: 'binary' } } };
      }
    }
  }
  return doc;
}

export function setupDocs(app: INestApplication) {
  if (process.env.API_DOCS === 'off') return;
  SwaggerModule.setup('docs', app, buildOpenApi(app), {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'Rent Manager API',
    swaggerOptions: { persistAuthorization: true, docExpansion: 'none', tagsSorter: 'alpha' },
  });
}
