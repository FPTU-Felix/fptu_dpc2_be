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
    documentVersionId?: string;
  }) {
    const queryEmbedding = await this.embeddingService.embedQuery(params.query);
    const topK = params.topK ?? 5;

    const sql = `
      SELECT
        dc.id,
        dc.document_version_id AS "documentVersionId",
        dc.chunk_index AS "chunkIndex",
        dc.content,
        dc.page_number AS "pageNumber",
        dc.section_path AS "sectionPath",
        dc.token_count AS "tokenCount",
        dc.metadata,
        dv.document_id AS "documentId",
        dv.version_label AS "versionLabel",
        d.title AS "documentTitle",
        d.category AS "documentCategory",
        (dc.embedding <=> $1::vector) AS "distance"
      FROM document_chunks dc
      INNER JOIN document_versions dv
        ON dv.id = dc.document_version_id
      INNER JOIN documents d
        ON d.id = dv.document_id
      WHERE dv.is_active = true
        AND dv.ingestion_status = 'COMPLETED'
        AND dc.embedding IS NOT NULL
        AND ($2::uuid IS NULL OR dv.document_id = $2::uuid)
        AND ($3::uuid IS NULL OR dv.id = $3::uuid)
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $4
    `;

    const rows = await this.dataSource.query(sql, [
      JSON.stringify(queryEmbedding),
      params.documentId ?? null,
      params.documentVersionId ?? null,
      topK,
    ]);

    return rows.map((row: any) => ({
      id: row.id,
      documentId: row.documentId,
      documentVersionId: row.documentVersionId,
      documentTitle: row.documentTitle,
      documentCategory: row.documentCategory,
      versionLabel: row.versionLabel,
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