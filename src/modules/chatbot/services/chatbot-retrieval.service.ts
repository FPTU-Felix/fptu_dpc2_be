import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmbeddingService } from '@/modules/embedding/services/embedding.service';

type RetrieveParams = {
  query: string;
  topK?: number;
  documentId?: string;
  fetchK?: number;
  expandNeighbors?: boolean;
};

type RetrievalRow = {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number | null;
  sectionPath?: string | null;
  tokenCount?: number | null;
  metadata?: Record<string, unknown> | null;
  documentTitle?: string | null;
  documentDescription?: string | null;
  fileUrl?: string | null;
  objectName?: string | null;
  distance: number;
};

type RetrievalResult = RetrievalRow & {
  score: number;
  rerankScore: number;
  lexicalScore: number;
  phraseScore: number;
  intentScore: number;
  titleOverlap: number;
  sectionOverlap: number;
  contentOverlap: number;
  matchedPhrases: string[];
  isNeighborExpanded?: boolean;
};

@Injectable()
export class ChatbotRetrievalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async retrieve(params: RetrieveParams): Promise<RetrievalResult[]> {
    const rawQuery = (params.query ?? '').trim();
    if (!rawQuery) {
      return [];
    }

    const topK = this.clamp(params.topK ?? 5, 1, 20);
    const fetchK = this.clamp(params.fetchK ?? Math.max(topK * 5, 20), topK, 80);
    const expandNeighbors = params.expandNeighbors ?? true;

    const normalizedQuery = this.normalizeText(rawQuery);
    const expandedQueries = this.buildExpandedQueries(rawQuery);
    const queryForEmbedding = expandedQueries.join('\n');

    const queryEmbedding = await this.embeddingService.embedQuery(queryForEmbedding);

    const candidateRows = await this.fetchSemanticCandidates({
      queryEmbedding,
      documentId: params.documentId,
      fetchK,
    });

    if (!candidateRows.length) {
      return [];
    }

    const rerankedRows = this.rerankRows({
      query: rawQuery,
      normalizedQuery,
      expandedQueries,
      rows: candidateRows,
    });

    const selectedBaseRows = this.diversifyResults(rerankedRows).slice(0, topK);

    let finalRows: RetrievalResult[] = selectedBaseRows;

    if (expandNeighbors && selectedBaseRows.length > 0) {
      const neighborRows = await this.fetchNeighborChunks(selectedBaseRows, params.documentId);
      finalRows = this.mergeBaseAndNeighbors(selectedBaseRows, neighborRows, {
        query: rawQuery,
        normalizedQuery,
        expandedQueries,
      });
    }

    return finalRows.slice(0, topK);
  }

  private async fetchSemanticCandidates(params: {
    queryEmbedding: number[];
    documentId?: string;
    fetchK: number;
  }): Promise<RetrievalRow[]> {
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
      ORDER BY dc.embedding <=> $1::vector ASC
      LIMIT $3
    `;

    const rows = await this.dataSource.query(sql, [
      JSON.stringify(params.queryEmbedding),
      params.documentId ?? null,
      params.fetchK,
    ]);

    return rows
      .map((row: any) => ({
        id: row.id,
        documentId: row.documentId,
        chunkIndex: Number(row.chunkIndex),
        content: row.content ?? '',
        pageNumber: row.pageNumber ?? null,
        sectionPath: row.sectionPath ?? null,
        tokenCount: row.tokenCount ?? null,
        metadata: row.metadata ?? null,
        documentTitle: row.documentTitle ?? null,
        documentDescription: row.documentDescription ?? null,
        fileUrl: row.fileUrl ?? null,
        objectName: row.objectName ?? null,
        distance: Number(row.distance),
      }))
      .filter((row: RetrievalRow) => Number.isFinite(row.distance));
  }

  private rerankRows(params: {
    query: string;
    normalizedQuery: string;
    expandedQueries: string[];
    rows: RetrievalRow[];
  }): RetrievalResult[] {
    const intent = this.detectIntent(params.query);
    const queryTerms = this.extractKeywords(params.expandedQueries.join(' '));
    const weightedPhrases = this.buildWeightedPhrases(intent, params.query);
    const negativePhrases = this.buildNegativePhrases(intent);

    return params.rows
      .map((row) => {
        const title = this.normalizeText(row.documentTitle ?? '');
        const section = this.normalizeText(row.sectionPath ?? '');
        const content = this.normalizeText(row.content ?? '');
        const wholeText = `${title} ${section} ${content}`.trim();

        const titleOverlap = this.countTermOverlap(queryTerms, title);
        const sectionOverlap = this.countTermOverlap(queryTerms, section);
        const contentOverlap = this.countTermOverlap(queryTerms, content);

        const lexicalScore =
          titleOverlap * 1.8 +
          sectionOverlap * 1.4 +
          contentOverlap * 0.8;

        let phraseScore = 0;
        const matchedPhrases: string[] = [];

        for (const item of weightedPhrases) {
          if (wholeText.includes(item.phrase)) {
            phraseScore += item.weight;
            matchedPhrases.push(item.phrase);
          }
        }

        for (const item of negativePhrases) {
          if (wholeText.includes(item.phrase)) {
            phraseScore += item.weight;
            matchedPhrases.push(item.phrase);
          }
        }

        const intentScore = this.computeIntentScore(intent, wholeText);

        /**
         * distance càng nhỏ càng tốt
         * semanticBase được đổi về chiều "càng cao càng tốt"
         */
        const semanticBase = Math.max(0, 1 - row.distance);

        const rerankScore =
          semanticBase * 4.5 +
          lexicalScore * 1.2 +
          phraseScore +
          intentScore;

        return {
          ...row,
          score: semanticBase,
          rerankScore,
          lexicalScore,
          phraseScore,
          intentScore,
          titleOverlap,
          sectionOverlap,
          contentOverlap,
          matchedPhrases,
        };
      })
      .sort((a, b) => {
        if (b.rerankScore !== a.rerankScore) {
          return b.rerankScore - a.rerankScore;
        }
        return a.distance - b.distance;
      });
  }

  private async fetchNeighborChunks(
    selectedRows: RetrievalResult[],
    documentId?: string,
  ): Promise<RetrievalRow[]> {
    const targets = new Map<string, Set<number>>();

    for (const row of selectedRows) {
      const indexes = targets.get(row.documentId) ?? new Set<number>();
      indexes.add(row.chunkIndex - 1);
      indexes.add(row.chunkIndex + 1);
      targets.set(row.documentId, indexes);
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [docId, chunkIndexes] of targets.entries()) {
      const validIndexes = [...chunkIndexes].filter((x) => x >= 0);
      if (!validIndexes.length) {
        continue;
      }

      conditions.push(
        `(dc.document_id = $${paramIndex}::uuid AND dc.chunk_index = ANY($${paramIndex + 1}::int[]))`,
      );
      values.push(docId, validIndexes);
      paramIndex += 2;
    }

    if (!conditions.length) {
      return [];
    }

    let documentFilterSql = '';
    if (documentId) {
      documentFilterSql = ` AND dc.document_id = $${paramIndex}::uuid `;
      values.push(documentId);
    }

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
        999999 AS "distance"
      FROM document_chunks dc
      INNER JOIN document_ai_knowledge d
        ON d.id = dc.document_id
      WHERE (${conditions.join(' OR ')})
      ${documentFilterSql}
    `;

    const rows = await this.dataSource.query(sql, values);

    return rows.map((row: any) => ({
      id: row.id,
      documentId: row.documentId,
      chunkIndex: Number(row.chunkIndex),
      content: row.content ?? '',
      pageNumber: row.pageNumber ?? null,
      sectionPath: row.sectionPath ?? null,
      tokenCount: row.tokenCount ?? null,
      metadata: row.metadata ?? null,
      documentTitle: row.documentTitle ?? null,
      documentDescription: row.documentDescription ?? null,
      fileUrl: row.fileUrl ?? null,
      objectName: row.objectName ?? null,
      distance: Number(row.distance),
    }));
  }

  private mergeBaseAndNeighbors(
    baseRows: RetrievalResult[],
    neighborRows: RetrievalRow[],
    params: {
      query: string;
      normalizedQuery: string;
      expandedQueries: string[];
    },
  ): RetrievalResult[] {
    if (!neighborRows.length) {
      return baseRows;
    }

    const neighborIds = new Set(neighborRows.map((row) => row.id));
    const baseIds = new Set(baseRows.map((row) => row.id));

    const rerankedNeighbors = this.rerankRows({
      query: params.query,
      normalizedQuery: params.normalizedQuery,
      expandedQueries: params.expandedQueries,
      rows: neighborRows,
    }).map((row) => ({
      ...row,
      /**
       * neighbor chỉ để bổ trợ ngữ cảnh, không nên dễ dàng lấn át chunk gốc
       */
      rerankScore: row.rerankScore - 1.2,
      isNeighborExpanded: true,
    }));

    const merged = [...baseRows];

    for (const row of rerankedNeighbors) {
      if (baseIds.has(row.id)) {
        continue;
      }
      merged.push(row);
    }

    return merged
      .filter((row, index, arr) => arr.findIndex((x) => x.id === row.id) === index)
      .sort((a, b) => {
        if (a.documentId === b.documentId && a.chunkIndex !== b.chunkIndex) {
          const aBase = baseIds.has(a.id);
          const bBase = baseIds.has(b.id);

          if (aBase && bBase) {
            return b.rerankScore - a.rerankScore;
          }

          if (aBase !== bBase) {
            return aBase ? -1 : 1;
          }
        }

        return b.rerankScore - a.rerankScore;
      });
  }

  private diversifyResults(rows: RetrievalResult[]): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    const seenIds = new Set<string>();
    const seenSectionKeys = new Set<string>();

    for (const row of rows) {
      if (seenIds.has(row.id)) {
        continue;
      }

      const sectionKey = `${row.documentId}::${this.normalizeText(row.sectionPath ?? '')}`;
      const shouldLimitSameSection =
        !!row.sectionPath && seenSectionKeys.has(sectionKey);

      if (shouldLimitSameSection && results.length >= 3) {
        continue;
      }

      results.push(row);
      seenIds.add(row.id);

      if (row.sectionPath) {
        seenSectionKeys.add(sectionKey);
      }
    }

    return results;
  }

  private buildExpandedQueries(query: string): string[] {
    const normalized = this.normalizeText(query);
    const queries = new Set<string>([normalized]);

    if (
      normalized.includes('dang vien') &&
      normalized.includes('dang phi') &&
      (normalized.includes('bao nhieu') ||
        normalized.includes('%') ||
        normalized.includes('luong') ||
        normalized.includes('thu nhap'))
    ) {
      queries.add('muc dong dang phi cua dang vien');
      queries.add('dang vien dong dang phi bao nhieu phan tram luong');
      queries.add('muc dang phi theo tien luong thu nhap phu cap');
    }

    if (normalized.includes('mien dang phi')) {
      queries.add('truong hop duoc mien dang phi');
      queries.add('dieu kien mien dong dang phi');
    }

    if (normalized.includes('giam dang phi')) {
      queries.add('truong hop duoc giam muc dong dang phi');
    }

    if (normalized.includes('phan bo dang phi')) {
      queries.add('phan bo dang phi thu duoc');
      queries.add('ty le de lai nop cap tren');
    }

    return [...queries];
  }

  private detectIntent(query: string): string {
    const normalized = this.normalizeText(query);

    if (
      normalized.includes('bao nhieu') ||
      normalized.includes('%') ||
      normalized.includes('muc dong') ||
      normalized.includes('dong dang phi') ||
      normalized.includes('luong') ||
      normalized.includes('thu nhap') ||
      normalized.includes('phu cap')
    ) {
      return 'contribution_amount';
    }

    if (normalized.includes('mien dang phi')) {
      return 'fee_exemption';
    }

    if (normalized.includes('giam dang phi')) {
      return 'fee_reduction';
    }

    if (
      normalized.includes('phan bo') ||
      normalized.includes('de lai') ||
      normalized.includes('nop ve')
    ) {
      return 'distribution';
    }

    return 'general';
  }

  private buildWeightedPhrases(
    intent: string,
    query: string,
  ): Array<{ phrase: string; weight: number }> {
    const common = [
      { phrase: 'dang phi', weight: 0.4 },
      { phrase: 'dang vien', weight: 0.5 },
    ];

    if (intent === 'contribution_amount') {
      return [
        ...common,
        { phrase: 'muc dong', weight: 4.5 },
        { phrase: 'dang vien dong', weight: 4.2 },
        { phrase: 'dong dang phi', weight: 4.6 },
        { phrase: 'tien luong', weight: 3.8 },
        { phrase: 'thu nhap', weight: 3.5 },
        { phrase: 'phu cap', weight: 3.0 },
        { phrase: 'hang thang', weight: 1.8 },
        { phrase: 'phan tram', weight: 2.2 },
        { phrase: '1%', weight: 2.0 },
        { phrase: '0,5%', weight: 2.0 },
      ];
    }

    if (intent === 'fee_exemption') {
      return [
        ...common,
        { phrase: 'mien dang phi', weight: 5.0 },
        { phrase: 'duoc mien', weight: 3.5 },
        { phrase: 'khong phai dong', weight: 3.0 },
      ];
    }

    if (intent === 'fee_reduction') {
      return [
        ...common,
        { phrase: 'giam muc dong', weight: 4.8 },
        { phrase: 'giam dang phi', weight: 5.0 },
        { phrase: 'duoc giam', weight: 3.4 },
      ];
    }

    if (intent === 'distribution') {
      return [
        ...common,
        { phrase: 'phan bo dang phi', weight: 4.5 },
        { phrase: 'duoc de lai', weight: 3.5 },
        { phrase: 'nop ve', weight: 3.5 },
        { phrase: 'trung uong', weight: 2.0 },
      ];
    }

    return common;
  }

  private buildNegativePhrases(
    intent: string,
  ): Array<{ phrase: string; weight: number }> {
    if (intent === 'contribution_amount') {
      return [
        { phrase: 'phan bo dang phi', weight: -5.5 },
        { phrase: 'duoc de lai', weight: -4.5 },
        { phrase: 'nop ve', weight: -4.5 },
        { phrase: 'so dang phi con lai', weight: -5.2 },
        { phrase: 'trung uong', weight: -1.2 },
      ];
    }

    if (intent === 'distribution') {
      return [
        { phrase: 'mien dang phi', weight: -3.0 },
        { phrase: 'giam muc dong', weight: -3.0 },
        { phrase: 'tien luong', weight: -2.2 },
        { phrase: 'thu nhap hang thang', weight: -2.2 },
      ];
    }

    return [];
  }

  private computeIntentScore(intent: string, text: string): number {
    if (intent === 'contribution_amount') {
      let score = 0;
      if (text.includes('muc dong')) score += 2.8;
      if (text.includes('dong dang phi')) score += 2.8;
      if (text.includes('tien luong')) score += 2.3;
      if (text.includes('thu nhap')) score += 2.0;
      if (text.includes('phu cap')) score += 1.8;
      if (text.includes('phan bo')) score -= 3.5;
      if (text.includes('duoc de lai')) score -= 3.0;
      return score;
    }

    if (intent === 'fee_exemption') {
      let score = 0;
      if (text.includes('mien dang phi')) score += 3.5;
      if (text.includes('duoc mien')) score += 2.0;
      return score;
    }

    if (intent === 'fee_reduction') {
      let score = 0;
      if (text.includes('giam dang phi')) score += 3.5;
      if (text.includes('giam muc dong')) score += 3.0;
      return score;
    }

    if (intent === 'distribution') {
      let score = 0;
      if (text.includes('phan bo')) score += 3.5;
      if (text.includes('duoc de lai')) score += 2.5;
      if (text.includes('nop ve')) score += 2.5;
      if (text.includes('tien luong')) score -= 2.2;
      return score;
    }

    return 0;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'la',
      'va',
      'cua',
      'cho',
      'voi',
      'tai',
      'theo',
      'nhung',
      'duoc',
      'bao',
      'nhieu',
      'co',
      'khong',
      'gi',
      'nao',
      'khi',
      'thi',
      'mot',
      'cac',
      'nguoi',
      'truong',
      'hop',
      'phan',
      'tram',
    ]);

    return [...new Set(
      this.normalizeText(text)
        .split(' ')
        .map((item) => item.trim())
        .filter((item) => item.length >= 2 && !stopWords.has(item)),
    )];
  }

  private countTermOverlap(terms: string[], text: string): number {
    if (!terms.length || !text) {
      return 0;
    }

    let count = 0;
    for (const term of terms) {
      if (text.includes(term)) {
        count += 1;
      }
    }
    return count;
  }

  private normalizeText(input: string): string {
    return this.removeVietnameseTones(
      input
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim(),
    );
  }

  private removeVietnameseTones(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}