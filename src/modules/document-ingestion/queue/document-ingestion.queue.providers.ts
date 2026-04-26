import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';

import { DocumentIngestionProcessor } from './document-ingestion.processor';
import { DOCUMENT_QUEUE } from 'src/modules/upload-documents/constants/document-queue.constant';

export const DOCUMENT_QUEUE_CONNECTION = 'DOCUMENT_QUEUE_CONNECTION';
export const DOCUMENT_QUEUE_TOKEN = 'DOCUMENT_QUEUE_TOKEN';
export const DOCUMENT_QUEUE_EVENTS_TOKEN = 'DOCUMENT_QUEUE_EVENTS_TOKEN';
export const DOCUMENT_WORKER_TOKEN = 'DOCUMENT_WORKER_TOKEN';

export const documentQueueProviders: Provider[] = [
  {
    provide: DOCUMENT_QUEUE_CONNECTION,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      return new IORedis({
        host: configService.get<string>('REDIS_HOST'),
        port: Number(configService.get<string>('REDIS_PORT') || 6379),
        password: configService.get<string>('REDIS_PASSWORD') || undefined,
        maxRetriesPerRequest: null,
      });
    },
  },
  {
    provide: DOCUMENT_QUEUE_TOKEN,
    inject: [DOCUMENT_QUEUE_CONNECTION],
    useFactory: (connection: IORedis) => {
      return new Queue(DOCUMENT_QUEUE, { connection });
    },
  },
  {
    provide: DOCUMENT_QUEUE_EVENTS_TOKEN,
    inject: [DOCUMENT_QUEUE_CONNECTION],
    useFactory: (connection: IORedis) => {
      return new QueueEvents(DOCUMENT_QUEUE, { connection });
    },
  },
  {
    provide: DOCUMENT_WORKER_TOKEN,
    inject: [DOCUMENT_QUEUE_CONNECTION, DocumentIngestionProcessor],
    useFactory: (
      connection: IORedis,
      processor: DocumentIngestionProcessor,
    ) => {
      return new Worker(DOCUMENT_QUEUE, async (job) => processor.handle(job), {
        connection,
        concurrency: 3,
      });
    },
  },
];
