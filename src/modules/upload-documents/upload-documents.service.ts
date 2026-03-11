import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Queue } from 'bullmq';

import {
  DocumentCategory,
  DocumentEntity,
} from './entities/document.entity';
import {
  DocumentVersionEntity,
  DocumentVersionStatus,
} from './entities/document-version.entity';
import { DocumentChunkEntity } from './entities/document-chunk.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentStorageService } from './services/document-storage.service';
import { DOCUMENT_JOB_NAMES } from './constants/document-queue.constant';
import { DOCUMENT_QUEUE_TOKEN } from '@/modules/document-ingestion/queue/document-ingestion.queue.providers';

@Injectable()
export class UploadDocumentsService {
  private readonly logger = new Logger(UploadDocumentsService.name);

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,

    @InjectRepository(DocumentVersionEntity)
    private readonly documentVersionRepository: Repository<DocumentVersionEntity>,

    @InjectRepository(DocumentChunkEntity)
    private readonly documentChunkRepository: Repository<DocumentChunkEntity>,

    private readonly storageService: DocumentStorageService,
    private readonly dataSource: DataSource,

    @Inject(DOCUMENT_QUEUE_TOKEN)
    private readonly documentQueue: Queue,
  ) {}

  async uploadAndQueue(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    adminUserId: string | null,
  ) {
    this.logger.log('uploadAndQueue called');

    if (!file) {
      this.logger.warn('File is missing');
      throw new BadRequestException('File is required');
    }

    this.validateFile(file);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.debug(
        `upload input: ${JSON.stringify({
          title: dto?.title,
          category: dto?.category,
          sourceOrigin: dto?.sourceOrigin,
          versionLabel: dto?.versionLabel,
          originalname: file?.originalname,
          mimetype: file?.mimetype,
          size: file?.size,
          adminUserId,
        })}`,
      );

      this.logger.log('Uploading file to S3...');
      const uploadResult = await this.storageService.uploadFile({
        fileBuffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      });
      this.logger.log(`S3 upload success. key=${uploadResult.key}`);
      this.logger.debug(
        `S3 upload result: ${JSON.stringify(uploadResult, null, 2)}`,
      );

      this.logger.log('Creating document record...');
      const documentPayload = {
        title: dto.title,
        fileUrl: uploadResult.fileUrl,
        category: dto.category ?? DocumentCategory.LAW,
        sourceOrigin: dto.sourceOrigin,
      };

      this.logger.debug(
        `documentPayload = ${JSON.stringify(documentPayload, null, 2)}`,
      );

      const document = queryRunner.manager.create(
        DocumentEntity,
        documentPayload,
      );

      this.logger.debug(
        `document entity before save = ${JSON.stringify(document, null, 2)}`,
      );

      const savedDocument = await queryRunner.manager.save(document);
      this.logger.log(`Document saved. id=${savedDocument.id}`);
      this.logger.debug(
        `savedDocument = ${JSON.stringify(savedDocument, null, 2)}`,
      );

      if (!savedDocument?.id) {
        throw new Error('savedDocument.id is missing after save');
      }

      this.logger.log('Creating document version record...');

      const versionPayload: Partial<DocumentVersionEntity> = {
        documentId: savedDocument.id,
        versionLabel: dto.versionLabel ?? 'v1',
        fileName: file.originalname,
        fileUrl: uploadResult.fileUrl,
        fileKey: uploadResult.key,
        fileType: file.mimetype,
        fileSize: String(file.size),
        checksum: uploadResult.checksum,
        uploadedBy: adminUserId ?? null,
        ingestionStatus: DocumentVersionStatus.PENDING,
        isActive: true,
      };

      this.logger.debug(
        `versionPayload = ${JSON.stringify(versionPayload, null, 2)}`,
      );

      const version = queryRunner.manager.create(
        DocumentVersionEntity,
        versionPayload,
      );

      this.logger.debug(
        `version.documentId before save = ${version.documentId}`,
      );
      this.logger.debug(
        `version.uploadedBy before save = ${version.uploadedBy}`,
      );
      this.logger.debug(
        `version entity before save = ${JSON.stringify(version, null, 2)}`,
      );

      const savedVersion = await queryRunner.manager.save(version);
      this.logger.log(`Document version saved. id=${savedVersion.id}`);
      this.logger.debug(
        `savedVersion = ${JSON.stringify(savedVersion, null, 2)}`,
      );

      await queryRunner.commitTransaction();
      this.logger.log('Transaction committed');

      this.logger.log('Adding ingestion job to BullMQ...');
      const job = await this.documentQueue.add(
        DOCUMENT_JOB_NAMES.INGEST_DOCUMENT,
        {
          documentVersionId: savedVersion.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
      this.logger.log(`Queue add success. jobId=${job.id}`);

      return {
        message: 'Document uploaded successfully and queued for ingestion',
        document: {
          id: savedDocument.id,
          title: savedDocument.title,
          category: savedDocument.category,
          fileUrl: savedDocument.fileUrl,
        },
        version: {
          id: savedVersion.id,
          versionLabel: savedVersion.versionLabel,
          status: savedVersion.ingestionStatus,
        },
        stats: {
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      };
    } catch (error: any) {
      this.logger.error('uploadAndQueue failed');
      this.logger.error(`message: ${error?.message}`);
      this.logger.error(`stack: ${error?.stack}`);

      try {
        await queryRunner.rollbackTransaction();
        this.logger.warn('Transaction rolled back');
      } catch (rollbackError: any) {
        this.logger.error(`Rollback failed: ${rollbackError?.message}`);
        this.logger.error(`Rollback stack: ${rollbackError?.stack}`);
      }

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Upload document failed',
      );
    } finally {
      await queryRunner.release();
      this.logger.log('QueryRunner released');
    }
  }

  async getDocumentChunks(documentVersionId: string) {
    this.logger.log(`getDocumentChunks called: ${documentVersionId}`);

    const items = await this.documentChunkRepository.find({
      where: { documentVersionId },
      order: { chunkIndex: 'ASC' },
    });

    this.logger.debug(`getDocumentChunks result count = ${items.length}`);
    return items;
  }

  private validateFile(file: Express.Multer.File) {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
    ];

    const allowedExtensions = [
      '.pdf',
      '.doc',
      '.docx',
      '.txt',
      '.html',
      '.htm',
    ];

    const fileName = file.originalname.toLowerCase();
    const isAllowedExtension = allowedExtensions.some((ext) =>
      fileName.endsWith(ext),
    );

    this.logger.debug(
      `validateFile: ${JSON.stringify({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        isAllowedExtension,
      })}`,
    );

    if (!allowedMimeTypes.includes(file.mimetype) && !isAllowedExtension) {
      throw new BadRequestException('Unsupported file type');
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Max size is 20MB');
    }
  }
}