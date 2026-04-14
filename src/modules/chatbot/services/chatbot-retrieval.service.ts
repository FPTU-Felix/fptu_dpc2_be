import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmbeddingService } from '@/modules/embedding/services/embedding.service';

@Injectable()
export class ChatbotRetrievalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async retrieve(params: {
    query: string;
    topK?: number;
    documentId?: string;
  }) {
    const queryEmbedding = await this.embeddingService.embedQuery(params.query);
    const topK = params.topK ?? 5;

    const sql = `
      SELECT
        dc.id,
        dc.document_id AS "documentId",
        dc.chunk_index AS "chunkIndex",
        dc.content,
        dc.page_number AS "pageNumber",
        dc.section_path AS "sectionPath",
        dc.token_count AS "tokenCount",
        dc.metadata,
        d.title AS "documentTitle",
        d.description AS "documentDescription",
        d.file_url AS "fileUrl",
        d.object_name AS "objectName",
        (dc.embedding <=> $1::vector) AS "distance"
      FROM document_chunks dc
      INNER JOIN document_ai_knowledge d
        ON d.id = dc.document_id
      WHERE dc.embedding IS NOT NULL
        AND ($2::uuid IS NULL OR dc.document_id = $2::uuid)
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $3
    `;

    const rows = await this.dataSource.query(sql, [
      JSON.stringify(queryEmbedding),
      params.documentId ?? null,
      topK,
    ]);

    return rows.map((row: any) => ({
      id: row.id,
      documentId: row.documentId,
      documentTitle: row.documentTitle,
      documentDescription: row.documentDescription,
      fileUrl: row.fileUrl,
      objectName: row.objectName,
      chunkIndex: row.chunkIndex,
      content: row.content,
      pageNumber: row.pageNumber,
      sectionPath: row.sectionPath,
      tokenCount: row.tokenCount,
      metadata: row.metadata,
      distance: Number(row.distance),
      score: 1 - Number(row.distance),
    }));
  }
}