import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { DocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser, ResponseMessage } from '../common/decorators';
import { DocumentsService } from './documents.service';
import { MAX_UPLOAD_BYTES } from './file-validation';

class UploadDocumentDto {
  @IsEnum(DocumentType, { message: 'Choose a valid document type' }) type: DocumentType;
  @IsOptional() @IsString() @MaxLength(80) label?: string;
}

@Controller()
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post('tenants/:tenantId/documents')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ResponseMessage('Document uploaded securely')
  upload(
    @CurrentUser() u: AuthUser,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.service.upload(u.userId, tenantId, file, dto.type, dto.label);
  }

  @Get('tenants/:tenantId/documents')
  list(@CurrentUser() u: AuthUser, @Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.list(u.userId, tenantId);
  }

  /** Authorises the request and returns a short-lived link. The link is never stored or logged. */
  @Get('documents/:id/url')
  url(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.signedUrl(u.userId, id);
  }

  @Delete('documents/:id')
  @ResponseMessage('Document deleted')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(u.userId, id);
  }
}
