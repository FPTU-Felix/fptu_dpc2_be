import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Queue } from 'bullmq';

import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentAiKnowledge } from './entities/document-ai-knowledge.entity';
import { DOCUMENT_JOB_NAMES } from './constants/document-queue.constant';
import { DOCUMENT_QUEUE_TOKEN } from '@/modules/document-ingestion/queue/document-ingestion.queue.providers';

@Injectable()
export class UploadDocumentsService {
  private readonly logger = new Logger(UploadDocumentsService.name);

  constructor(
    @InjectRepository(DocumentAiKnowledge)
    private readonly documentAiKnowledgeRepository: Repository<DocumentAiKnowledge>,
    private readonly dataSource: DataSource,
    @Inject(DOCUMENT_QUEUE_TOKEN)
    private readonly documentQueue: Queue,
  ) {}

  async createAndQueue(
    dto: UploadDocumentDto,
    adminUserId: string | null,
  ) {
    this.logger.log('createAndQueue called');

    if (!dto?.title?.trim()) {
      throw new BadRequestException('Title is required');
    }

    if (!dto?.fileUrl?.trim()) {
      throw new BadRequestException('fileUrl is required');
    }

    if (!dto?.objectName?.trim()) {
      throw new BadRequestException('objectName is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payload: Partial<DocumentAiKnowledge> = {
        title: dto.title.trim(),
        description: dto.description?.trim() || undefined,
        fileUrl: dto.fileUrl.trim(),
        objectName: dto.objectName.trim(),
        bucket: dto.bucket?.trim() || undefined,
        fileName: dto.fileName?.trim() || undefined,
        mimeType: dto.mimeType?.trim() || undefined,
        createdBy: adminUserId ?? undefined,
      };

      this.logger.debug(`payload = ${JSON.stringify(payload, null, 2)}`);

      const document = queryRunner.manager.create(DocumentAiKnowledge, payload);

      this.logger.debug(
        `document entity before save = ${JSON.stringify(document, null, 2)}`,
      );

      const savedDocument = await queryRunner.manager.save(document);

      this.logger.log(`DocumentAiKnowledge saved. id=${savedDocument.id}`);
      this.logger.debug(
        `savedDocument = ${JSON.stringify(savedDocument, null, 2)}`,
      );

      if (!savedDocument?.id) {
        throw new Error('savedDocument.id is missing after save');
      }

      await queryRunner.commitTransaction();
      this.logger.log('Transaction committed');

      this.logger.log('Adding ingestion job to BullMQ...');
      const job = await this.documentQueue.add(
        DOCUMENT_JOB_NAMES.INGEST_DOCUMENT,
        {
          documentAiKnowledgeId: savedDocument.id,
          objectName: savedDocument.objectName,
          fileUrl: savedDocument.fileUrl,
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
        message: 'Document AI knowledge created successfully and queued',
        data: {
          id: savedDocument.id,
          title: savedDocument.title,
          description: savedDocument.description,
          partyCellId: savedDocument.partyCellId,
          createdBy: savedDocument.createdBy,
          fileUrl: savedDocument.fileUrl,
          objectName: savedDocument.objectName,
          bucket: savedDocument.bucket,
          fileName: savedDocument.fileName,
          mimeType: savedDocument.mimeType,
          fileSize: savedDocument.fileSize,
          createdAt: savedDocument.createdAt,
          updatedAt: savedDocument.updatedAt,
        },
        queue: {
          jobId: job.id,
          jobName: DOCUMENT_JOB_NAMES.INGEST_DOCUMENT,
        },
      };
    } catch (error: any) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rollbackError: any) {}

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Create document AI knowledge failed',
      );
    } finally {
      await queryRunner.release();
      this.logger.log('QueryRunner released');
    }
  }

  async getById(id: string) {
    this.logger.log(`getById called: ${id}`);

    const item = await this.documentAiKnowledgeRepository.findOne({
      where: { id },
      relations: {
        partyCell: true,
        user: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Document AI knowledge not found');
    }

    return item;
  }
}