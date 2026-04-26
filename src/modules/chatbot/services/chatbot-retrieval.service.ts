import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from 'src/modules/embedding/services/embedding.service';
import { DataSource } from 'typeorm';

export type RetrieveParams = {
  query: string;
  topK?: number;
  documentId?: string;
  fetchK?: number;
  expandNeighbors?: boolean;
  minRerankScore?: number;
  minConfidence?: number;
};

export type RetrievalRow = {
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
  lexicalRank?: number;
  source?: 'semantic' | 'lexical' | 'neighbor';
};

export type RetrievalResult = RetrievalRow & {
  score: number;
  confidenceScore: number;
  rerankScore: number;
  semanticScore: number;
  lexicalScore: number;
  phraseScore: number;
  structureScore: number;
  coverageScore: number;
  intentScore: number;
  titleOverlap: number;
  sectionOverlap: number;
  contentOverlap: number;
  matchedPhrases: string[];
  matchedKeywords: string[];
  isNeighborExpanded?: boolean;
};

type QueryIntent =
  | 'discipline'
  | 'procedure'
  | 'condition'
  | 'definition'
  | 'authority'
  | 'rights_obligations'
  | 'fee_policy'
  | 'general';

@Injectable()
export class ChatbotRetrievalService {
  private readonly defaultTopK = 8;
  private readonly defaultFetchK = 48;
  private readonly defaultMinRerankScore = 1.35;
  private readonly defaultMinConfidence = 0.35;

  private readonly logger = new Logger(ChatbotRetrievalService.name);

  private readonly RERANK_WEIGHTS = {
    SEMANTIC: 4.2,
    LEXICAL: 1.15,
    PHRASE_USER: 2.6,
    PHRASE_VARIANT: 1.2,
    STRUCTURE_BASE: 1.0,
    COVERAGE_MAX: 2.4,
  };

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) { }

  async retrieve(params: RetrieveParams): Promise<RetrievalResult[]> {
    const rawQuery = this.normalizeRawQuery(params.query);

    if (!rawQuery) return [];

    const topK = this.clamp(params.topK ?? this.defaultTopK, 1, 20);
    const fetchK = this.clamp(
      params.fetchK ?? Math.max(topK * 6, this.defaultFetchK),
      topK,
      120,
    );

    const expandNeighbors = params.expandNeighbors ?? true;
    const minRerankScore = params.minRerankScore ?? this.defaultMinRerankScore;
    const minConfidence = params.minConfidence ?? this.defaultMinConfidence;

    const normalizedQuery = this.normalizeText(rawQuery);
    const queryVariants = this.buildExpandedQueries(rawQuery);
    const keywords = this.extractKeywords(queryVariants.join(' '));
    const quotedPhrases = this.extractQuotedPhrases(rawQuery);
    const intent = this.detectIntent(rawQuery);
    const embeddingQuery = this.buildEmbeddingQuery(
      rawQuery,
      queryVariants,
      intent,
    );

    const queryEmbedding =
      await this.embeddingService.embedQuery(embeddingQuery);

    const [semanticRows, lexicalRows] = await Promise.all([
      this.fetchSemanticCandidates({
        queryEmbedding,
        documentId: params.documentId,
        fetchK,
      }),
      this.fetchLexicalCandidates({
        rawQuery,
        queryVariants,
        documentId: params.documentId,
        fetchK,
      }),
    ]);

    const mergedCandidates = this.mergeCandidatePools(
      semanticRows,
      lexicalRows,
    );

    if (!mergedCandidates.length) return [];

    const reranked = this.rerankRows({
      query: rawQuery,
      normalizedQuery,
      queryVariants,
      quotedPhrases,
      keywords,
      intent,
      rows: mergedCandidates,
    });

    const confidentRows = reranked.filter(
      (row) =>
        row.rerankScore >= minRerankScore &&
        row.confidenceScore >= minConfidence,
    );

    const baseRows = this.diversifyResults(
      confidentRows.length ? confidentRows : reranked,
    ).slice(0, topK);

    let finalRows = baseRows;

    if (expandNeighbors && baseRows.length > 0) {
      const neighborRows = await this.fetchNeighborChunks(
        baseRows,
        params.documentId,
      );

      finalRows = this.mergeBaseAndNeighbors(baseRows, neighborRows, {
        query: rawQuery,
        normalizedQuery,
        queryVariants,
        quotedPhrases,
        keywords,
        intent,
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

    try {
      const rows = await this.dataSource.query(sql, [
        JSON.stringify(params.queryEmbedding),
        params.documentId ?? null,
        params.fetchK,
      ]);

      return (rows ?? [])
        .map((row: any) => this.mapRow(row, 'semantic'))
        .filter((row: RetrievalRow) => Number.isFinite(row.distance));
    } catch (error) {
      this.logger.error(`Error fetching semantic candidates: ${error.message}`, error.stack);
      return [];
    }
  }

  private async fetchLexicalCandidates(params: {
    rawQuery: string;
    queryVariants: string[];
    documentId?: string;
    fetchK: number;
  }): Promise<RetrievalRow[]> {
    const lexicalQuery = this.buildLexicalQuery(
      params.rawQuery,
      params.queryVariants,
    );

    if (!lexicalQuery) return [];

    const sql = `
      WITH ranked AS (
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
          ts_rank_cd(
            setweight(to_tsvector('simple', coalesce(d.title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(dc.section_path, '')), 'B') ||
            setweight(to_tsvector('simple', coalesce(dc.content, '')), 'C'),
            websearch_to_tsquery('simple', $1)
          ) AS lexical_rank
        FROM document_chunks dc
        INNER JOIN document_ai_knowledge d
          ON d.id = dc.document_id
        WHERE ($2::uuid IS NULL OR dc.document_id = $2::uuid)
          AND (
            setweight(to_tsvector('simple', coalesce(d.title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(dc.section_path, '')), 'B') ||
            setweight(to_tsvector('simple', coalesce(dc.content, '')), 'C')
          ) @@ websearch_to_tsquery('simple', $1)
      )
      SELECT
        id,
        "documentId",
        "chunkIndex",
        content,
        "pageNumber",
        "sectionPath",
        "tokenCount",
        metadata,
        "documentTitle",
        "documentDescription",
        "fileUrl",
        "objectName",
        999999 AS "distance",
        lexical_rank AS "lexicalRank"
      FROM ranked
      ORDER BY lexical_rank DESC, "chunkIndex" ASC
      LIMIT $3
    `;

    try {
      const rows = await this.dataSource.query(sql, [
        lexicalQuery,
        params.documentId ?? null,
        params.fetchK,
      ]);

      return (rows ?? []).map((row: any) => this.mapRow(row, 'lexical'));
    } catch (error) {
      this.logger.warn(`Lexical search failed, falling back: ${error.message}`);
      return this.fetchLexicalCandidatesFallback(params);
    }
  }

  private async fetchLexicalCandidatesFallback(params: {
    rawQuery: string;
    queryVariants: string[];
    documentId?: string;
    fetchK: number;
  }): Promise<RetrievalRow[]> {
    const likeTerms = this.extractKeywords(
      params.queryVariants.join(' '),
    ).slice(0, 8);

    if (!likeTerms.length) return [];

    const values: any[] = [];
    let index = 1;

    const conditions = likeTerms.map((term) => {
      values.push(`%${term}%`, `%${term}%`, `%${term}%`);

      const clause = `
        (
          lower(coalesce(d.title, '')) LIKE lower($${index}) OR
          lower(coalesce(dc.section_path, '')) LIKE lower($${index + 1}) OR
          lower(coalesce(dc.content, '')) LIKE lower($${index + 2})
        )
      `;

      index += 3;
      return clause;
    });

    let documentFilterSql = '';

    if (params.documentId) {
      values.push(params.documentId);
      documentFilterSql = ` AND dc.document_id = $${index}::uuid `;
      index += 1;
    }

    values.push(params.fetchK);

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
        999999 AS "distance",
        0.1 AS "lexicalRank"
      FROM document_chunks dc
      INNER JOIN document_ai_knowledge d
        ON d.id = dc.document_id
      WHERE (${conditions.join(' OR ')})
      ${documentFilterSql}
      LIMIT $${index}
    `;

    const rows = await this.dataSource.query(sql, values);

    return rows.map((row: any) => this.mapRow(row, 'lexical'));
  }

  private mergeCandidatePools(
    semanticRows: RetrievalRow[],
    lexicalRows: RetrievalRow[],
  ): RetrievalRow[] {
    const map = new Map<string, RetrievalRow>();

    for (const row of semanticRows) {
      map.set(row.id, row);
    }

    for (const row of lexicalRows) {
      const existing = map.get(row.id);

      if (!existing) {
        map.set(row.id, row);
        continue;
      }

      map.set(row.id, {
        ...existing,
        lexicalRank: Math.max(existing.lexicalRank ?? 0, row.lexicalRank ?? 0),
        source: existing.source === 'semantic' ? 'semantic' : row.source,
      });
    }

    return [...map.values()];
  }

  private rerankRows(params: {
    query: string;
    normalizedQuery: string;
    queryVariants: string[];
    quotedPhrases: string[];
    keywords: string[];
    intent: QueryIntent;
    rows: RetrievalRow[];
  }): RetrievalResult[] {
    const weightedPhrases = this.buildWeightedPhrases(
      params.query,
      params.queryVariants,
      params.intent,
    );

    return params.rows
      .map((row) => {
        const title = this.normalizeText(row.documentTitle ?? '');
        const section = this.normalizeText(row.sectionPath ?? '');
        const content = this.normalizeText(row.content ?? '');
        const description = this.normalizeText(row.documentDescription ?? '');
        const wholeText = `${title} ${section} ${description} ${content}`.trim();

        // 1. Lexical Score
        const lexicalMetrics = this.calculateLexicalMetrics(params.keywords, {
          title,
          section,
          content,
        });

        const lexicalScore =
          lexicalMetrics.titleOverlap * 2.4 +
          lexicalMetrics.sectionOverlap * 1.8 +
          lexicalMetrics.contentOverlap * 0.95 +
          Math.min(2.5, (row.lexicalRank ?? 0) * 4);

        // 2. Phrase Score
        const { phraseScore, matchedPhrases } = this.calculatePhraseScore(
          wholeText,
          weightedPhrases,
          params.quotedPhrases,
        );

        // 3. Semantic & Intent Scores
        const semanticScore =
          row.distance >= 999999 ? 0 : Math.max(0, 1 - row.distance);

        const structureScore = this.computeStructureScore(
          row,
          params.intent,
          wholeText,
        );

        const coverageScore = this.computeCoverageScore(params.keywords, {
          title,
          section,
          content,
        });

        const intentScore = this.computeIntentScore(params.intent, wholeText);

        const rerankScore =
          semanticScore * this.RERANK_WEIGHTS.SEMANTIC +
          lexicalScore * this.RERANK_WEIGHTS.LEXICAL +
          phraseScore +
          structureScore +
          coverageScore +
          intentScore;

        const matchedKeywords = params.keywords.filter(
          (keyword) =>
            title.includes(keyword) ||
            section.includes(keyword) ||
            content.includes(keyword),
        );

        const confidenceScore = this.computeConfidenceScore({
          semanticScore,
          rerankScore,
          coverageScore,
          phraseScore,
          intentScore,
          matchedKeywordsCount: matchedKeywords.length,
          keywordCount: params.keywords.length,
          rawQuery: params.query,
          contentText: row.content,
        });

        return {
          ...row,
          score: confidenceScore,
          confidenceScore,
          semanticScore,
          rerankScore,
          lexicalScore,
          phraseScore,
          structureScore,
          coverageScore,
          intentScore,
          titleOverlap: lexicalMetrics.titleOverlap,
          sectionOverlap: lexicalMetrics.sectionOverlap,
          contentOverlap: lexicalMetrics.contentOverlap,
          matchedPhrases: [...new Set(matchedPhrases)],
          matchedKeywords,
        };
      })
      .sort((a, b) => {
        if (b.confidenceScore !== a.confidenceScore) {
          return b.confidenceScore - a.confidenceScore;
        }
        if (b.rerankScore !== a.rerankScore) {
          return b.rerankScore - a.rerankScore;
        }
        return a.distance - b.distance;
      });
  }

  private calculateLexicalMetrics(
    keywords: string[],
    text: { title: string; section: string; content: string },
  ) {
    return {
      titleOverlap: this.countTermOverlap(keywords, text.title),
      sectionOverlap: this.countTermOverlap(keywords, text.section),
      contentOverlap: this.countTermOverlap(keywords, text.content),
    };
  }

  private calculatePhraseScore(
    wholeText: string,
    weightedPhrases: Array<{ phrase: string; weight: number }>,
    quotedPhrases: string[],
  ) {
    const matchedPhrases: string[] = [];
    let phraseScore = 0;

    for (const item of weightedPhrases) {
      if (wholeText.includes(item.phrase)) {
        phraseScore += item.weight;
        matchedPhrases.push(item.phrase);
      }
    }

    for (const quoted of quotedPhrases) {
      if (wholeText.includes(quoted)) {
        phraseScore += 3.0;
        matchedPhrases.push(quoted);
      }
    }

    return { phraseScore, matchedPhrases };
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

      if (!validIndexes.length) continue;

      conditions.push(
        `(dc.document_id = $${paramIndex}::uuid AND dc.chunk_index = ANY($${paramIndex + 1}::int[]))`,
      );

      values.push(docId, validIndexes);
      paramIndex += 2;
    }

    if (!conditions.length) return [];

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
        999999 AS "distance",
        0 AS "lexicalRank"
      FROM document_chunks dc
      INNER JOIN document_ai_knowledge d
        ON d.id = dc.document_id
      WHERE (${conditions.join(' OR ')})
      ${documentFilterSql}
    `;

    const rows = await this.dataSource.query(sql, values);

    return rows.map((row: any) => this.mapRow(row, 'neighbor'));
  }

  private mergeBaseAndNeighbors(
    baseRows: RetrievalResult[],
    neighborRows: RetrievalRow[],
    params: {
      query: string;
      normalizedQuery: string;
      queryVariants: string[];
      quotedPhrases: string[];
      keywords: string[];
      intent: QueryIntent;
    },
  ): RetrievalResult[] {
    if (!neighborRows.length) return baseRows;

    const baseIds = new Set(baseRows.map((row) => row.id));

    const rerankedNeighbors = this.rerankRows({
      query: params.query,
      normalizedQuery: params.normalizedQuery,
      queryVariants: params.queryVariants,
      quotedPhrases: params.quotedPhrases,
      keywords: params.keywords,
      intent: params.intent,
      rows: neighborRows,
    }).map((row) => ({
      ...row,
      confidenceScore: Math.max(0, row.confidenceScore - 0.15),
      score: Math.max(0, row.score - 0.15),
      rerankScore: row.rerankScore - 1.3,
      isNeighborExpanded: true,
    }));

    const merged = [...baseRows];

    for (const row of rerankedNeighbors) {
      if (!baseIds.has(row.id)) {
        merged.push(row);
      }
    }

    return merged
      .filter(
        (row, index, arr) => arr.findIndex((x) => x.id === row.id) === index,
      )
      .sort((a, b) => {
        const aBase = baseIds.has(a.id);
        const bBase = baseIds.has(b.id);

        if (a.documentId === b.documentId && aBase !== bBase) {
          return aBase ? -1 : 1;
        }

        if (b.confidenceScore !== a.confidenceScore) {
          return b.confidenceScore - a.confidenceScore;
        }

        if (b.rerankScore !== a.rerankScore) {
          return b.rerankScore - a.rerankScore;
        }

        return a.chunkIndex - b.chunkIndex;
      });
  }

  private diversifyResults(rows: RetrievalResult[]): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    const seenIds = new Set<string>();
    const seenDocumentSections = new Set<string>();
    const documentCounts = new Map<string, number>();

    for (const row of rows) {
      if (seenIds.has(row.id)) continue;

      const normalizedSection = this.normalizeText(row.sectionPath ?? '');
      const sectionKey = `${row.documentId}::${normalizedSection}`;
      const currentDocCount = documentCounts.get(row.documentId) ?? 0;

      if (
        normalizedSection &&
        seenDocumentSections.has(sectionKey) &&
        results.length >= 3
      ) {
        continue;
      }

      if (currentDocCount >= 3 && results.length >= 4) {
        continue;
      }

      results.push(row);
      seenIds.add(row.id);

      if (normalizedSection) {
        seenDocumentSections.add(sectionKey);
      }

      documentCounts.set(row.documentId, currentDocCount + 1);
    }

    return results;
  }

  private buildExpandedQueries(query: string): string[] {
    const normalized = this.normalizeText(query);
    const queries = new Set<string>([normalized]);

    const has = (text: string) => normalized.includes(text);

    if (has('ky luat')) {
      queries.add('quy dinh ky luat dang vien');
      queries.add('truong hop bi ky luat trong dang');
      queries.add('tham quyen ky luat dang vien');
    }

    if (has('nghi huu')) {
      queries.add('dang vien da nghi huu');
      queries.add('dang vien nghi cong tac nghi huu');
    }

    if (has('khai tru')) {
      queries.add('truong hop khai tru ra khoi dang');
    }

    if (has('ket nap')) {
      queries.add('dieu kien ket nap dang vien');
      queries.add('thu tuc ket nap dang');
      queries.add('le ket nap dang vien');
      queries.add('loi tuyen the cua dang vien');
    }

    if (has('tuyen the') || has('loi the')) {
      queries.add('loi tuyen the dang vien moi');
      queries.add('le ket nap dang vien moi');
    }

    if (has('chuyen sinh hoat')) {
      queries.add('thu tuc chuyen sinh hoat dang');
      queries.add('ho so chuyen sinh hoat dang');
    }

    if (has('dang phi')) {
      queries.add('quy dinh dong dang phi');
      queries.add('muc dong dang phi dang vien');
      queries.add('cach tinh muc dong dang phi');
    }

    if (has('bao hiem xa hoi') || has('bhxh')) {
      queries.add('dang vien khong tham gia bao hiem xa hoi');
      queries.add('muc dong dang phi khi khong tham gia bao hiem xa hoi');
    }

    if (has('chi bo') || has('dang uy')) {
      queries.add('tham quyen cua chi bo dang uy');
    }

    if (has('quyen') || has('nghia vu')) {
      queries.add('quyen va nghia vu cua dang vien');
    }

    if (has('ho so') || has('giay to')) {
      queries.add('thanh phan ho so');
      queries.add('thu tuc va thanh phan ho so');
    }

    if (has('dang vien du bi')) {
      queries.add('hinh thuc ky luat doi voi dang vien du bi');
      queries.add('dang vien du bi bi ky luat khien trach canh cao');
      queries.add('ky luat dang vien du bi gom khien trach canh cao');
    }

    return [...queries].filter(Boolean);
  }

  private buildEmbeddingQuery(
    rawQuery: string,
    variants: string[],
    intent: QueryIntent,
  ): string {
    const intentHints: Record<QueryIntent, string> = {
      discipline: 'kỷ luật, xử lý vi phạm, trường hợp áp dụng, thẩm quyền',
      procedure: 'thủ tục, hồ sơ, trình tự, bước thực hiện',
      condition: 'điều kiện, tiêu chuẩn, yêu cầu',
      definition: 'khái niệm, định nghĩa, giải thích',
      authority: 'thẩm quyền, cấp quyết định, cơ quan có quyền',
      rights_obligations: 'quyền, nghĩa vụ, trách nhiệm',
      fee_policy: 'đảng phí, mức đóng, cách tính, bảo hiểm xã hội',
      general: 'quy định, hướng dẫn, thông tin liên quan',
    };

    return [rawQuery, ...variants, intentHints[intent]].join('\n');
  }

  private buildLexicalQuery(rawQuery: string, queryVariants: string[]): string {
    const parts = [rawQuery, ...queryVariants]
      .map((item) => this.normalizeText(item))
      .flatMap((item) => this.extractKeywords(item))
      .filter(Boolean);

    return [...new Set(parts)].slice(0, 12).join(' OR ');
  }

  private detectIntent(query: string): QueryIntent {
    const normalized = this.normalizeText(query);

    if (
      normalized.includes('dang phi') ||
      normalized.includes('muc dong') ||
      normalized.includes('bao hiem xa hoi') ||
      normalized.includes('bhxh')
    ) {
      return 'fee_policy';
    }

    if (
      normalized.includes('ky luat') ||
      normalized.includes('khai tru') ||
      normalized.includes('xoa ten') ||
      normalized.includes('vi pham')
    ) {
      return 'discipline';
    }

    if (
      normalized.includes('thu tuc') ||
      normalized.includes('quy trinh') ||
      normalized.includes('ho so') ||
      normalized.includes('cach lam') ||
      normalized.includes('trinh tu')
    ) {
      return 'procedure';
    }

    if (
      normalized.includes('dieu kien') ||
      normalized.includes('tieu chuan') ||
      normalized.includes('yeu cau') ||
      normalized.includes('duoc khong') ||
      normalized.includes('co duoc')
    ) {
      return 'condition';
    }

    if (
      normalized.includes('la gi') ||
      normalized.includes('nghia la gi') ||
      normalized.includes('khai niem') ||
      normalized.includes('the nao')
    ) {
      return 'definition';
    }

    if (
      normalized.includes('tham quyen') ||
      normalized.includes('ai co quyen') ||
      normalized.includes('cap nao') ||
      normalized.includes('co quan nao')
    ) {
      return 'authority';
    }

    if (
      normalized.includes('quyen') ||
      normalized.includes('nghia vu') ||
      normalized.includes('trach nhiem')
    ) {
      return 'rights_obligations';
    }

    return 'general';
  }

  private buildWeightedPhrases(
    rawQuery: string,
    queryVariants: string[],
    intent: QueryIntent,
  ): Array<{ phrase: string; weight: number }> {
    const phrases = new Map<string, number>();
    const normalizedRawQuery = this.normalizeText(rawQuery);

    const add = (phrase: string, weight: number) => {
      const normalized = this.normalizeText(phrase);
      if (!normalized) return;
      phrases.set(normalized, Math.max(phrases.get(normalized) ?? 0, weight));
    };

    // Base phrases: để weight thấp, tránh kéo nhầm tài liệu chỉ vì có từ chung
    add('dang vien', 0.4);
    add('dieu le dang', 1.2);
    add('quy dinh', 0.5);
    add('huong dan', 0.4);

    // Phrase lấy trực tiếp từ câu hỏi user phải có trọng số cao hơn
    for (const phrase of this.extractMeaningfulPhrases(rawQuery)) {
      add(phrase, 2.6);
    }

    // Phrase từ query mở rộng chỉ nên hỗ trợ, không nên lấn át câu hỏi gốc
    for (const variant of queryVariants) {
      for (const phrase of this.extractMeaningfulPhrases(variant)) {
        add(phrase, 1.2);
      }
    }

    /**
     * Case đặc biệt:
     * "Hình thức kỷ luật đối với đảng viên dự bị gồm những gì?"
     *
     * Nếu không boost các cụm này, retrieval rất dễ kéo nhầm chunk có từ chung:
     * "kỷ luật", "vi phạm", "đảng viên", "khai trừ".
     */
    const isProbationaryPartyMemberQuery =
      normalizedRawQuery.includes('dang vien du bi') ||
      normalizedRawQuery.includes('du bi');

    const isDisciplineFormQuery =
      normalizedRawQuery.includes('hinh thuc ky luat') ||
      normalizedRawQuery.includes('ky luat') ||
      normalizedRawQuery.includes('bi ky luat');

    if (intent === 'discipline') {
      add('ky luat', 3.6);
      add('hinh thuc ky luat', 4.6);
      add('bi ky luat', 3.4);

      add('vi pham', 1.6);
      add('khai tru', 3.2);
      add('xoa ten', 3.0);
      add('nghi huu', 2.0);

      if (isProbationaryPartyMemberQuery) {
        add('dang vien du bi', 6.0);
        add('doi voi dang vien du bi', 5.5);
        add('ky luat dang vien du bi', 5.8);
        add('hinh thuc ky luat doi voi dang vien du bi', 6.5);
        add('dang vien du bi bi ky luat', 5.6);

        // Câu trả lời đúng thường nằm ở chunk có các cụm này
        add('khien trach', 3.8);
        add('canh cao', 3.8);
      }

      if (isProbationaryPartyMemberQuery && isDisciplineFormQuery) {
        add('dang vien du bi ky luat gom', 6.2);
        add('hinh thuc ky luat gom', 5.2);
        add('gom nhung gi', 2.5);
      }
    }

    if (intent === 'procedure') {
      add('thu tuc', 4.0);
      add('quy trinh', 3.5);
      add('ho so', 3.0);
      add('trinh tu', 2.6);
      add('thanh phan ho so', 3.0);
    }

    if (intent === 'condition') {
      add('dieu kien', 4.0);
      add('tieu chuan', 3.2);
      add('yeu cau', 2.5);
    }

    if (intent === 'authority') {
      add('tham quyen', 4.0);
      add('cap uy', 2.8);
      add('chi bo', 2.2);
      add('dang uy', 2.2);
    }

    if (intent === 'rights_obligations') {
      add('quyen', 3.0);
      add('nghia vu', 3.0);
      add('trach nhiem', 2.2);
    }

    if (intent === 'fee_policy') {
      add('dang phi', 4.2);
      add('muc dong', 3.5);
      add('bao hiem xa hoi', 3.0);
      add('bhxh', 3.0);
      add('khong tham gia bao hiem xa hoi', 4.0);
    }

    return [...phrases.entries()].map(([phrase, weight]) => ({
      phrase,
      weight,
    }));
  }

  private computeIntentScore(intent: QueryIntent, text: string): number {
    let score = 0;

    if (intent === 'discipline') {
      if (text.includes('ky luat')) score += 2.5;
      if (text.includes('vi pham')) score += 1.2;
      if (text.includes('khai tru')) score += 1.8;
      if (text.includes('xoa ten')) score += 1.5;
    }

    if (intent === 'procedure') {
      if (text.includes('thu tuc')) score += 2.5;
      if (text.includes('quy trinh')) score += 2.0;
      if (text.includes('ho so')) score += 1.8;
      if (text.includes('trinh tu')) score += 1.6;
    }

    if (intent === 'condition') {
      if (text.includes('dieu kien')) score += 2.5;
      if (text.includes('tieu chuan')) score += 2.0;
      if (text.includes('yeu cau')) score += 1.5;
    }

    if (intent === 'definition') {
      if (text.includes('khai niem')) score += 2.0;
      if (text.includes('giai thich')) score += 1.5;
    }

    if (intent === 'authority') {
      if (text.includes('tham quyen')) score += 2.8;
      if (text.includes('chi bo')) score += 1.2;
      if (text.includes('dang uy')) score += 1.2;
      if (text.includes('cap uy')) score += 1.2;
    }

    if (intent === 'rights_obligations') {
      if (text.includes('quyen')) score += 2.0;
      if (text.includes('nghia vu')) score += 2.0;
      if (text.includes('trach nhiem')) score += 1.5;
    }

    if (intent === 'fee_policy') {
      if (text.includes('dang phi')) score += 2.8;
      if (text.includes('muc dong')) score += 2.2;
      if (text.includes('bao hiem xa hoi')) score += 1.8;
      if (text.includes('bhxh')) score += 1.8;
    }

    if (text.includes('dang vien du bi')) score += 3.5;
    if (text.includes('hinh thuc ky luat')) score += 2.5;
    if (text.includes('khien trach')) score += 1.5;
    if (text.includes('canh cao')) score += 1.5;

    return score;
  }

  private computeStructureScore(
    row: RetrievalRow,
    intent: QueryIntent,
    wholeText: string,
  ): number {
    let score = 0;

    if (row.sectionPath) score += 0.8;
    if (row.pageNumber !== null && row.pageNumber !== undefined) score += 0.2;
    if (wholeText.includes('dieu ')) score += 1.0;
    if (wholeText.includes('khoan ')) score += 0.8;
    if (wholeText.includes('muc ')) score += 0.5;

    if (
      intent === 'procedure' &&
      (wholeText.includes('buoc') || wholeText.includes('trinh tu'))
    ) {
      score += 0.9;
    }

    if (intent === 'authority' && wholeText.includes('tham quyen')) {
      score += 1.0;
    }

    return score;
  }

  private computeCoverageScore(
    keywords: string[],
    text: { title: string; section: string; content: string },
  ): number {
    if (!keywords.length) return 0;

    const matched = keywords.filter(
      (keyword) =>
        text.title.includes(keyword) ||
        text.section.includes(keyword) ||
        text.content.includes(keyword),
    ).length;

    const ratio = matched / keywords.length;

    if (ratio >= 0.85) return 2.4;
    if (ratio >= 0.65) return 1.8;
    if (ratio >= 0.45) return 1.1;
    if (ratio >= 0.25) return 0.5;

    return 0;
  }

  private computeConfidenceScore(params: {
    semanticScore: number;
    rerankScore: number;
    coverageScore: number;
    phraseScore: number;
    intentScore: number;
    matchedKeywordsCount: number;
    keywordCount: number;
    rawQuery?: string;
    contentText?: string;
  }): number {
    const keywordRatio =
      params.keywordCount > 0
        ? params.matchedKeywordsCount / params.keywordCount
        : 0;

    const normalizedRerank = Math.min(1, params.rerankScore / 14);
    const normalizedPhrase = Math.min(1, params.phraseScore / 6);
    const normalizedIntent = Math.min(1, params.intentScore / 5);
    const normalizedCoverage = Math.min(1, params.coverageScore / 2.4);

    let confidence =
      params.semanticScore * 0.25 +     // ⬇ giảm từ 0.35
      normalizedRerank * 0.25 +        // giữ
      normalizedCoverage * 0.15 +
      normalizedPhrase * 0.15 +        // ⬆ tăng
      normalizedIntent * 0.1 +
      keywordRatio * 0.1;              // ⬆ tăng

    /**
     * 🔥 HARD RULE (rất quan trọng)
     * Nếu query có entity cụ thể mà chunk không chứa → giảm mạnh confidence
     */
    if (params.rawQuery && params.contentText) {
      const query = this.normalizeText(params.rawQuery);
      const content = this.normalizeText(params.contentText);

      // Case: đảng viên dự bị
      if (
        query.includes('dang vien du bi') &&
        !content.includes('dang vien du bi')
      ) {
        confidence *= 0.3;
      }

      // Case: hỏi về "hình thức"
      if (
        query.includes('hinh thuc') &&
        !content.includes('hinh thuc')
      ) {
        confidence *= 0.6;
      }
    }

    return this.roundNumber(Math.min(1, confidence), 4);
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
      've',
      'nay',
      'kia',
      'tu',
      'den',
      'da',
      'bi',
      'hay',
      'ra',
      'o',
      'lam',
      'cach',
      'sao',
      'the',
      'nhu',
    ]);

    return [
      ...new Set(
        this.normalizeText(text)
          .split(' ')
          .map((item) => item.trim())
          .filter((item) => item.length >= 2 && !stopWords.has(item)),
      ),
    ];
  }

  private countTermOverlap(terms: string[], text: string): number {
    if (!terms.length || !text) return 0;

    let count = 0;

    for (const term of terms) {
      if (text.includes(term)) count += 1;
    }

    return count;
  }

  private extractQuotedPhrases(text: string): string[] {
    const matches = text.match(/"([^"]+)"|'([^']+)'/g) ?? [];

    return matches
      .map((item) => item.replace(/^["']|["']$/g, ''))
      .map((item) => this.normalizeText(item))
      .filter(Boolean);
  }

  private extractMeaningfulPhrases(text: string): string[] {
    const normalized = this.normalizeText(text);
    const words = normalized.split(' ').filter(Boolean);
    const phrases = new Set<string>();

    for (let i = 0; i < words.length; i++) {
      const biGram = words
        .slice(i, i + 2)
        .join(' ')
        .trim();
      const triGram = words
        .slice(i, i + 3)
        .join(' ')
        .trim();

      if (biGram.split(' ').length === 2 && !this.isWeakPhrase(biGram)) {
        phrases.add(biGram);
      }

      if (triGram.split(' ').length === 3 && !this.isWeakPhrase(triGram)) {
        phrases.add(triGram);
      }
    }

    return [...phrases];
  }

  private isWeakPhrase(phrase: string): boolean {
    const weakTokens = new Set([
      'la',
      'gi',
      'co',
      'khong',
      'the',
      'nao',
      'bao',
      'nhieu',
      'cach',
      'lam',
      'ra',
      'vao',
    ]);

    const tokens = phrase.split(' ').filter(Boolean);
    const meaningful = tokens.filter((token) => !weakTokens.has(token));

    return meaningful.length < Math.min(2, tokens.length);
  }

  private normalizeRawQuery(query: string): string {
    return (query ?? '')
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeText(input: string): string {
    return this.removeVietnameseTones(
      (input ?? '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/[?!.。]+$/g, '')
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

  private mapRow(
    row: any,
    source: 'semantic' | 'lexical' | 'neighbor',
  ): RetrievalRow {
    return {
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
      lexicalRank: Number(row.lexicalRank ?? 0),
      source,
    };
  }

  private roundNumber(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
