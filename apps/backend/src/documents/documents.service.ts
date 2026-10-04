import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../common/audit.service';
import { PrismaService } from '../common/prisma.service';
import { STORAGE, StorageProvider } from '../storage/storage.service';
import { safeFileName, sniffFile } from './file-validation';

export const SIGNED_URL_TTL_SECONDS = 300;
const MAX_DOCS_PER_TENANT = 20;

const publicFields = { id: true, tenantId: true, type: true, label: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true } as const;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger('Documents');

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE) private readonly storage: StorageProvider,
  ) {}

  private async assertTenant(userId: string, tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null, property: { ownerId: userId } }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  /** Every document access goes through the owner check; documents are never reachable by id alone. */
  private async ownedDocument(userId: string, id: string) {
    const doc = await this.prisma.tenantDocument.findFirst({ where: { id, deletedAt: null, tenant: { property: { ownerId: userId } } } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async upload(userId: string, tenantId: string, file: { buffer: Buffer; originalname?: string } | undefined, type: DocumentType, label?: string) {
    await this.assertTenant(userId, tenantId);
    if (!file) throw new BadRequestException('Choose a file to upload');
    const { mime, ext } = sniffFile(file.buffer);
    const count = await this.prisma.tenantDocument.count({ where: { tenantId, deletedAt: null } });
    if (count >= MAX_DOCS_PER_TENANT) throw new BadRequestException('This tenant has reached the maximum number of documents');

    const key = `tenants/${tenantId}/${type.toLowerCase()}/${randomUUID()}.${ext}`;
    await this.storage.put(key, file.buffer, mime);
    try {
      const doc = await this.prisma.tenantDocument.create({
        data: { tenantId, type, label: label?.trim() || null, storageKey: key, fileName: safeFileName(file.originalname, ext), mimeType: mime, sizeBytes: file.buffer.length },
        select: publicFields,
      });
      await this.audit.log(userId, 'document.upload', 'tenant_document', doc.id, { type });
      return doc;
    } catch (e) {
      await this.storage.delete(key).catch(() => undefined); // do not leave orphaned private files
      throw e;
    }
  }

  async list(userId: string, tenantId: string) {
    await this.assertTenant(userId, tenantId);
    return this.prisma.tenantDocument.findMany({ where: { tenantId, deletedAt: null }, orderBy: [{ type: 'asc' }, { createdAt: 'desc' }], select: publicFields });
  }

  async signedUrl(userId: string, id: string) {
    const doc = await this.ownedDocument(userId, id);
    const signed = await this.storage.signedUrl(doc.storageKey, { ttlSeconds: SIGNED_URL_TTL_SECONDS, fileName: doc.fileName, contentType: doc.mimeType });
    await this.audit.log(userId, 'document.view', 'tenant_document', doc.id, { type: doc.type });
    return { url: signed.url, expiresAt: signed.expiresAt, mimeType: doc.mimeType, fileName: doc.fileName };
  }

  async remove(userId: string, id: string) {
    const doc = await this.ownedDocument(userId, id);
    await this.prisma.tenantDocument.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.storage.delete(doc.storageKey).catch(() => this.logger.warn(`Could not remove stored object for document ${id}`));
    await this.audit.log(userId, 'document.delete', 'tenant_document', id, { type: doc.type });
    return null;
  }
}
