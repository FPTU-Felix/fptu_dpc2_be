import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmbeddingService } from 'src/modules/embedding/services/embedding.service';

export type RagIntent =
  | 'policy_lookup'
  | 'process_lookup'
  | 'document_lookup'
  | 'discipline_lookup'
  | 'fee_lookup'
  | 'admission_lookup'
  | 'profile_lookup'
  | 'meeting_lookup'
  | 'organization_lookup'
  | 'inspection_lookup'
  | 'unknown';

export type RetrieveParams = {
  query: string;
  topK?: number;
  fetchK?: number;
  documentId?: string;
  intent?: RagIntent | string;
  expandNeighbors?: boolean;
  minConfidence?: number;
  minRerankScore?: number;
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
  source?: 'semantic' | 'lexical' | 'exact' | 'neighbor';
};

export type RetrievalResult = RetrievalRow & {
  score: number;
  confidenceScore: number;
  rerankScore: number;
  semanticScore: number;
  lexicalScore: number;
  phraseScore: number;
  intentScore: number;
  structureScore: number;
  coverageScore: number;
  penaltyScore: number;
  gateScore: number;
  titleOverlap: number;
  sectionOverlap: number;
  contentOverlap: number;
  matchedPhrases: string[];
  matchedKeywords: string[];
  isNeighborExpanded?: boolean;
};

type InternalIntent =
  | 'discipline'
  | 'fee_policy'
  | 'admission'
  | 'procedure'
  | 'document'
  | 'profile'
  | 'meeting'
  | 'organization'
  | 'policy'
  | 'inspection'
  | 'general';

type IntentProfile = {
  mustHaveAny: string[];
  positive: string[];
  strongPositive: string[];
  negative: string[];
  hardNegative: string[];
  titleHints: string[];
};

@Injectable()
export class ChatbotRetrievalService {
  private readonly logger = new Logger(ChatbotRetrievalService.name);

  private readonly defaultTopK = 8;
  private readonly defaultFetchK = 100;
  private readonly defaultMinConfidence = 0.18;
  private readonly defaultMinRerankScore = 0.5;

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async retrieve(params: RetrieveParams): Promise<RetrievalResult[]> {
    const rawQuery = this.normalizeRawQuery(params.query);
    if (!rawQuery) return [];

    const topK = this.clamp(params.topK ?? this.defaultTopK, 1, 20);
    const fetchK = this.clamp(
      params.fetchK ?? Math.max(topK * 12, this.defaultFetchK),
      topK,
      180,
    );

    const intent = this.resolveIntent(rawQuery, params.intent);
    const queryVariants = this.buildExpandedQueries(rawQuery, intent);
    const embeddingQuery = this.buildEmbeddingQuery(rawQuery, queryVariants, intent);

    const normalizedQuery = this.normalizeText(rawQuery);
    const keywords = this.extractKeywords([rawQuery, ...queryVariants].join(' '));
    const quotedPhrases = this.extractQuotedPhrases(rawQuery);
    const mustKeywords = this.getDynamicMustHaveKeywords(rawQuery, intent);

    const queryEmbedding = await this.embeddingService.embedQuery(embeddingQuery);

    const [semanticRows, lexicalRows, exactRows] = await Promise.all([
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
      this.fetchExactKeywordCandidates({
        rawQuery,
        intent,
        mustKeywords,
        documentId: params.documentId,
        fetchK,
      }),
    ]);

    const candidates = this.mergeCandidatePools([
      ...semanticRows,
      ...lexicalRows,
      ...exactRows,
    ]);

    if (!candidates.length) return [];

    const reranked = this.rerankRows({
      query: rawQuery,
      normalizedQuery,
      queryVariants,
      quotedPhrases,
      keywords,
      mustKeywords,
      intent,
      rows: candidates,
    });

    const gatedRows = this.applyDomainGate(reranked, {
      query: rawQuery,
      intent,
      mustKeywords,
    });

    const minConfidence = params.minConfidence ?? this.defaultMinConfidence;
    const minRerankScore = params.minRerankScore ?? this.defaultMinRerankScore;

    const confidentRows = gatedRows.filter((row) => {
      if (this.hasStrongIntentEvidence(row, intent)) return true;

      return (
        row.confidenceScore >= minConfidence &&
        row.rerankScore >= minRerankScore &&
        !this.isClearlyWrongDomain(row, intent)
      );
    });

    const selectedRows = confidentRows.length
      ? confidentRows
      : gatedRows.filter((row) => row.gateScore > 0).slice(0, topK);

    const baseRows = this.diversifyResults(selectedRows).slice(0, topK);

    if ((params.expandNeighbors ?? true) === false || !baseRows.length) {
      return baseRows;
    }

    const neighborRows = await this.fetchNeighborChunks(baseRows, params.documentId);

    return this.mergeBaseAndNeighbors(baseRows, neighborRows, {
      query: rawQuery,
      normalizedQuery,
      queryVariants,
      quotedPhrases,
      keywords,
      mustKeywords,
      intent,
    }).slice(0, topK);
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
      INNER JOIN document_ai_knowledge d ON d.id = dc.document_id
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
      this.logger.error(
        `Semantic retrieval failed: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      return [];
    }
  }

  private async fetchLexicalCandidates(params: {
    rawQuery: string;
    queryVariants: string[];
    documentId?: string;
    fetchK: number;
  }): Promise<RetrievalRow[]> {
    const lexicalQuery = this.buildLexicalQuery(params.rawQuery, params.queryVariants);
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
        INNER JOIN document_ai_knowledge d ON d.id = dc.document_id
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
      this.logger.warn(
        `Lexical search failed, fallback LIKE search used: ${this.getErrorMessage(error)}`,
      );

      return this.fetchLikeCandidates({
        terms: this.extractKeywords([params.rawQuery, ...params.queryVariants].join(' ')),
        documentId: params.documentId,
        fetchK: params.fetchK,
        source: 'lexical',
      });
    }
  }

  private async fetchExactKeywordCandidates(params: {
    rawQuery: string;
    intent: InternalIntent;
    mustKeywords: string[];
    documentId?: string;
    fetchK: number;
  }): Promise<RetrievalRow[]> {
    const q = this.normalizeText(params.rawQuery);

    const exactTerms = new Set<string>();

    for (const kw of params.mustKeywords) exactTerms.add(kw);

    if (q.includes('tuyen truyen')) exactTerms.add('tuyen truyen');
    if (q.includes('phat ngon')) exactTerms.add('phat ngon');
    if (q.includes('tu kiem tra')) exactTerms.add('tu kiem tra');
    if (q.includes('cap tren')) exactTerms.add('cap tren');
    if (q.includes('dang vien du bi')) exactTerms.add('dang vien du bi');
    if (q.includes('the dang vien')) exactTerms.add('the dang vien');
    if (q.includes('sinh hoat chi bo')) exactTerms.add('sinh hoat chi bo');

    const profile = this.getIntentProfile(params.intent);
    for (const phrase of profile.strongPositive) exactTerms.add(phrase);

    return this.fetchLikeCandidates({
      terms: [...exactTerms],
      documentId: params.documentId,
      fetchK: params.fetchK,
      source: 'exact',
    });
  }

  private async fetchLikeCandidates(params: {
    terms: string[];
    documentId?: string;
    fetchK: number;
    source: 'lexical' | 'exact';
  }): Promise<RetrievalRow[]> {
    const terms = [...new Set(params.terms.map((x) => this.normalizeText(x)).filter(Boolean))]
      .slice(0, 16);

    if (!terms.length) return [];

    const values: any[] = [];
    let index = 1;

    const conditions = terms.map((term) => {
      values.push(`%${term}%`, `%${term}%`, `%${term}%`);

      const clause = `
        (
          lower(unaccent(coalesce(d.title, ''))) LIKE lower($${index}) OR
          lower(unaccent(coalesce(dc.section_path, ''))) LIKE lower($${index + 1}) OR
          lower(unaccent(coalesce(dc.content, ''))) LIKE lower($${index + 2})
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
        ${params.source === 'exact' ? '1.0' : '0.2'} AS "lexicalRank"
      FROM document_chunks dc
      INNER JOIN document_ai_knowledge d ON d.id = dc.document_id
      WHERE (${conditions.join(' OR ')})
      ${documentFilterSql}
      LIMIT $${index}
    `;

    try {
      const rows = await this.dataSource.query(sql, values);
      return (rows ?? []).map((row: any) => this.mapRow(row, params.source));
    } catch (error) {
      this.logger.warn(`LIKE candidate search failed: ${this.getErrorMessage(error)}`);
      return [];
    }
  }

  private mergeCandidatePools(rows: RetrievalRow[]): RetrievalRow[] {
    const map = new Map<string, RetrievalRow>();

    for (const row of rows) {
      const existing = map.get(row.id);

      if (!existing) {
        map.set(row.id, row);
        continue;
      }

      map.set(row.id, {
        ...existing,
        lexicalRank: Math.max(existing.lexicalRank ?? 0, row.lexicalRank ?? 0),
        source: existing.source === 'exact' || row.source === 'exact'
          ? 'exact'
          : existing.source === 'semantic'
            ? 'semantic'
            : row.source,
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
    mustKeywords: string[];
    intent: InternalIntent;
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
        const description = this.normalizeText(row.documentDescription ?? '');
        const content = this.normalizeText(row.content ?? '');
        const wholeText = `${title} ${section} ${description} ${content}`.trim();

        const lexicalMetrics = this.calculateLexicalMetrics(params.keywords, {
          title,
          section,
          content,
        });

        const semanticScore =
          row.distance >= 999999 ? 0 : this.clamp(1 - row.distance, 0, 1);

        const lexicalScore =
          lexicalMetrics.titleOverlap * 3.2 +
          lexicalMetrics.sectionOverlap * 3.0 +
          lexicalMetrics.contentOverlap * 1.1 +
          Math.min(4.5, (row.lexicalRank ?? 0) * 5);

        const { phraseScore, matchedPhrases } = this.calculatePhraseScore(
          wholeText,
          weightedPhrases,
          params.quotedPhrases,
        );

        const gateScore = this.computeGateScore(wholeText, params.mustKeywords);
        const intentScore = this.computeIntentScore(params.intent, wholeText);
        const structureScore = this.computeStructureScore(row, params.intent, wholeText);
        const coverageScore = this.computeCoverageScore(params.keywords, {
          title,
          section,
          content,
        });
        const penaltyScore = this.computePenaltyScore(params.intent, wholeText);
        const querySpecificScore = this.computeQuerySpecificScore(
          params.intent,
          params.normalizedQuery,
          wholeText,
        );

        const sourceBoost =
          row.source === 'exact' ? 3.5 : row.source === 'lexical' ? 1.0 : 0;

        const rerankScore =
          semanticScore * 2.2 +
          lexicalScore * 1.2 +
          phraseScore +
          gateScore * 4.5 +
          intentScore +
          structureScore +
          coverageScore +
          querySpecificScore +
          sourceBoost -
          penaltyScore;

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
          gateScore,
          penaltyScore,
          matchedKeywordsCount: matchedKeywords.length,
          keywordCount: params.keywords.length,
          rawQuery: params.query,
          contentText: wholeText,
        });

        return {
          ...row,
          score: confidenceScore,
          confidenceScore,
          semanticScore,
          rerankScore,
          lexicalScore,
          phraseScore,
          intentScore,
          structureScore,
          coverageScore,
          penaltyScore,
          gateScore,
          titleOverlap: lexicalMetrics.titleOverlap,
          sectionOverlap: lexicalMetrics.sectionOverlap,
          contentOverlap: lexicalMetrics.contentOverlap,
          matchedPhrases: [...new Set(matchedPhrases)],
          matchedKeywords,
        };
      })
      .sort((a, b) => {
        if (b.gateScore !== a.gateScore) return b.gateScore - a.gateScore;
        if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
        if (b.rerankScore !== a.rerankScore) return b.rerankScore - a.rerankScore;
        return a.distance - b.distance;
      });
  }

  private applyDomainGate(
    rows: RetrievalResult[],
    params: {
      query: string;
      intent: InternalIntent;
      mustKeywords: string[];
    },
  ): RetrievalResult[] {
    if (!rows.length) return [];

    const strictKeywords = params.mustKeywords;
    const hasStrictKeyword = strictKeywords.length > 0;

    const passed = rows.filter((row) => {
      const text = this.normalizeText(
        `${row.documentTitle ?? ''} ${row.sectionPath ?? ''} ${row.content ?? ''}`,
      );

      if (this.isClearlyWrongDomain(row, params.intent)) return false;

      if (!hasStrictKeyword) return true;

      return strictKeywords.some((kw) => text.includes(kw));
    });

    if (passed.length) return passed;

    return rows
      .filter((row) => !this.isClearlyWrongDomain(row, params.intent))
      .slice(0, 5);
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

    for (const [docId, indexes] of targets.entries()) {
      const validIndexes = [...indexes].filter((x) => x >= 0);
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
      INNER JOIN document_ai_knowledge d ON d.id = dc.document_id
      WHERE (${conditions.join(' OR ')})
      ${documentFilterSql}
    `;

    try {
      const rows = await this.dataSource.query(sql, values);
      return (rows ?? []).map((row: any) => this.mapRow(row, 'neighbor'));
    } catch (error) {
      this.logger.warn(`Neighbor retrieval failed: ${this.getErrorMessage(error)}`);
      return [];
    }
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
      mustKeywords: string[];
      intent: InternalIntent;
    },
  ): RetrievalResult[] {
    if (!neighborRows.length) return baseRows;

    const baseIds = new Set(baseRows.map((row) => row.id));

    const rerankedNeighbors = this.rerankRows({
      ...params,
      rows: neighborRows,
    })
      .filter((row) => !this.isClearlyWrongDomain(row, params.intent))
      .map((row) => ({
        ...row,
        confidenceScore: Math.max(0, row.confidenceScore - 0.15),
        score: Math.max(0, row.score - 0.15),
        rerankScore: row.rerankScore - 1.2,
        isNeighborExpanded: true,
      }));

    return [...baseRows, ...rerankedNeighbors]
      .filter((row, index, arr) => arr.findIndex((x) => x.id === row.id) === index)
      .sort((a, b) => {
        const aBase = baseIds.has(a.id);
        const bBase = baseIds.has(b.id);

        if (aBase !== bBase) return aBase ? -1 : 1;
        if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
        if (b.rerankScore !== a.rerankScore) return b.rerankScore - a.rerankScore;
        return a.chunkIndex - b.chunkIndex;
      });
  }

  private diversifyResults(rows: RetrievalResult[]): RetrievalResult[] {
    const results: RetrievalResult[] = [];
    const seenIds = new Set<string>();
    const seenSections = new Set<string>();
    const docCounts = new Map<string, number>();

    for (const row of rows) {
      if (seenIds.has(row.id)) continue;

      const section = this.normalizeText(row.sectionPath ?? '');
      const sectionKey = `${row.documentId}::${section}`;
      const currentDocCount = docCounts.get(row.documentId) ?? 0;

      if (section && seenSections.has(sectionKey) && results.length >= 4) continue;
      if (currentDocCount >= 5 && results.length >= 6) continue;

      results.push(row);
      seenIds.add(row.id);
      if (section) seenSections.add(sectionKey);
      docCounts.set(row.documentId, currentDocCount + 1);
    }

    return results;
  }

  private buildExpandedQueries(query: string, intent: InternalIntent): string[] {
    const normalized = this.normalizeText(query);
    const queries = new Set<string>([normalized]);
    const has = (text: string) => normalized.includes(text);

    if (intent === 'discipline' || has('ky luat') || has('vi pham')) {
      queries.add('quy dinh ky luat dang vien');
      queries.add('xu ly vi pham dang vien');
      queries.add('hinh thuc ky luat dang vien');
      queries.add('nguyen tac xu ly ky luat');
      queries.add('thoi hieu ky luat khien trach canh cao cach chuc');
      queries.add('doi tuong ap dung ky luat dang vien nghi huu');
      queries.add('vi pham ve chinh tri tuyen truyen phat ngon');
      queries.add('hanh vi vi pham tuyen truyen phat ngon');
      queries.add('khien trach canh cao cach chuc khai tru');
    }

    if (has('thoi hieu') || (has('bao lau') && (has('canh cao') || has('cach chuc')))) {
      queries.add('thoi hieu xu ly ky luat');
      queries.add('thoi hieu ky luat canh cao cach chuc');
      queries.add('nguyen tac xu ly ky luat thoi hieu');
    }

    if (has('nghi huu') || has('thoi chuc') || has('khong con cong tac')) {
      queries.add('dang vien nghi huu xem xet ky luat');
      queries.add('doi tuong ap dung ky luat dang vien da nghi huu');
      queries.add('dang vien sau khi chuyen cong tac nghi viec nghi huu');
    }

    if (has('tuyen truyen') || has('phat ngon')) {
      queries.add('vi pham ve tuyen truyen phat ngon');
      queries.add('hanh vi tuyen truyen phat ngon trai quy dinh');
      queries.add('vi pham ve chinh tri va nguyen tac to chuc sinh hoat dang');
    }

    if (has('dang vien du bi') || has('du bi')) {
      queries.add('dang vien du bi vi pham');
      queries.add('hinh thuc ky luat doi voi dang vien du bi');
      queries.add('dang vien du bi vi pham den muc phai thi hanh ky luat');
      queries.add('khien trach canh cao doi voi dang vien du bi');
      queries.add('khong du tu cach xoa ten dang vien du bi');
    }

    if (intent === 'inspection' || has('kiem tra') || has('giam sat')) {
      queries.add('cong tac kiem tra giam sat trong dang');
      queries.add('tu kiem tra cua can bo dang vien');
      queries.add('kiem tra cua cap tren va tu kiem tra');
      queries.add('ket qua kiem tra giam sat dung de lam gi');
      queries.add('nguyen tac kiem tra giam sat to chuc dang');
    }

    if (intent === 'fee_policy' || has('dang phi')) {
      queries.add('quy dinh ve che do dang phi');
      queries.add('trach nhiem dong dang phi');
      queries.add('muc dong dang phi');
      queries.add('muc dong dang phi doi voi dang vien o nuoc ngoai');
      queries.add('muc dong dang phi doi voi dang vien o trong nuoc');
      queries.add('mien dong dang phi tuoi dang');
      queries.add('thu nop quan ly dang phi');
      queries.add('phan bo dang phi thu duoc');
      queries.add('cong khai dang phi');
    }

    if (intent === 'fee_policy' && has('nuoc ngoai')) {
      queries.add('dang vien o nuoc ngoai dong dang phi');
      queries.add('muc dong dang phi doi voi dang vien o nuoc ngoai');
    }

    if (intent === 'fee_policy' && (has('mien') || has('tuoi dang'))) {
      queries.add('mien dong dang phi');
      queries.add('dang vien duoc mien dong dang phi');
      queries.add('tuoi dang mien dong dang phi');
    }

    if (intent === 'admission' || has('ket nap') || has('vao dang')) {
      queries.add('dieu kien ket nap dang vien');
      queries.add('thu tuc ket nap dang');
      queries.add('ho so ket nap dang vien');
      queries.add('chi bo de nghi ket nap nguoi vao dang');
      queries.add('cong nhan dang vien chinh thuc');
    }

    if (intent === 'profile' || has('the dang vien') || has('ho so dang vien')) {
      queries.add('quan ly ho so dang vien');
      queries.add('the dang vien');
      queries.add('phat the dang vien');
      queries.add('cap lai the dang vien');
      queries.add('mat the dang vien');
      queries.add('chuyen sinh hoat dang');
    }

    if (intent === 'meeting' || has('sinh hoat chi bo')) {
      queries.add('sinh hoat chi bo');
      queries.add('dang vien tham gia sinh hoat dinh ky');
      queries.add('nghia vu tham gia sinh hoat chi bo');
    }

    if (intent === 'procedure' || has('thu tuc') || has('quy trinh')) {
      queries.add('quy trinh thu tuc ho so');
      queries.add('trinh tu thuc hien');
      queries.add('thanh phan ho so');
    }

    return [...queries].filter(Boolean);
  }

  private buildEmbeddingQuery(
    rawQuery: string,
    variants: string[],
    intent: InternalIntent,
  ): string {
    const hints: Record<InternalIntent, string> = {
      discipline:
        'kỷ luật đảng viên, thời hiệu xử lý kỷ luật, nguyên tắc xử lý kỷ luật, đối tượng áp dụng kỷ luật, đảng viên nghỉ hưu, vi phạm, hành vi vi phạm, khiển trách, cảnh cáo, cách chức, khai trừ',
      fee_policy:
        'đảng phí, chế độ đảng phí, mức đóng, mức đóng đảng phí ở nước ngoài, miễn đóng đảng phí, tuổi đảng, trách nhiệm đóng đảng phí, thu nộp quản lý đảng phí, phân bổ đảng phí',
      admission:
        'kết nạp đảng viên, người xin vào Đảng, chi bộ đề nghị kết nạp, hồ sơ kết nạp, lễ kết nạp',
      procedure: 'quy trình, thủ tục, hồ sơ, trình tự thực hiện, giấy tờ',
      document: 'văn bản, tài liệu, quyết định, nghị quyết, hướng dẫn',
      profile:
        'hồ sơ đảng viên, lý lịch đảng viên, thẻ đảng viên, cấp lại thẻ đảng viên, chuyển sinh hoạt đảng',
      meeting:
        'sinh hoạt chi bộ, họp chi bộ, tham dự sinh hoạt định kỳ, nghĩa vụ sinh hoạt chi bộ',
      organization: 'chi bộ, đảng ủy, chi ủy, bí thư, phó bí thư, tổ chức đảng',
      policy: 'quy định, điều lệ đảng, nguyên tắc, trách nhiệm, nghĩa vụ',
      inspection:
        'kiểm tra, giám sát, tự kiểm tra, kiểm tra của cấp trên, kết quả kiểm tra, công tác giám sát',
      general: 'quy định, hướng dẫn, thông tin nghiệp vụ đảng viên',
    };

    return [rawQuery, hints[intent], ...variants].join('\n');
  }

  private buildLexicalQuery(rawQuery: string, queryVariants: string[]): string {
    const terms = [rawQuery, ...queryVariants]
      .map((item) => this.normalizeText(item))
      .flatMap((item) => this.extractKeywords(item))
      .filter(Boolean);

    return [...new Set(terms)].slice(0, 16).join(' OR ');
  }

  private resolveIntent(query: string, externalIntent?: RagIntent | string): InternalIntent {
    const detectedIntent = this.detectIntent(query);

    /**
     * Uu tien intent suy luan tu noi dung cau hoi hon intent ben ngoai.
     * Classifier ben ngoai co the gan sai do thay cac tu nhu "xu ly", "quy dinh".
     */
    if (detectedIntent !== 'general') {
      return detectedIntent;
    }

    switch (externalIntent) {
      case 'discipline_lookup':
        return 'discipline';
      case 'fee_lookup':
        return 'fee_policy';
      case 'admission_lookup':
        return 'admission';
      case 'process_lookup':
        return 'procedure';
      case 'document_lookup':
        return 'document';
      case 'profile_lookup':
        return 'profile';
      case 'meeting_lookup':
        return 'meeting';
      case 'organization_lookup':
        return 'organization';
      case 'inspection_lookup':
        return 'inspection';
      case 'policy_lookup':
        return 'policy';
      default:
        return detectedIntent;
    }
  }

  private detectIntent(query: string): InternalIntent {
    const q = this.normalizeText(query);

    /**
     * Dang phi phai check truoc discipline/policy/procedure.
     * Nhieu cau hoi dang phi co chua tu "xu ly", "quy dinh", "bao nhieu", "mien".
     */
    if (
      this.includesAny(q, [
        'dang phi',
        'muc dong dang phi',
        'dong dang phi',
        'nop dang phi',
        'thu dang phi',
        'phan bo dang phi',
        'quan ly dang phi',
        'su dung dang phi',
        'mien dang phi',
        'mien dong dang phi',
        'khong phai dong dang phi',
        'tuoi dang',
        'nam tuoi dang',
        'bhxh',
      ]) ||
      (
        this.includesAny(q, ['muc dong', 'dong bao nhieu', 'bao nhieu tien', 'ty le dong']) &&
        this.includesAny(q, ['dang vien', 'trong nuoc', 'nuoc ngoai'])
      )
    ) {
      return 'fee_policy';
    }

    if (
      this.includesAny(q, [
        'thoi hieu',
        'thoi han ky luat',
        'ky luat',
        'vi pham',
        'khai tru',
        'xoa ten',
        'khien trach',
        'canh cao',
        'cach chuc',
        'tuyen truyen',
        'phat ngon',
        'xem xet ky luat',
        'thi hanh ky luat',
      ])
    ) {
      return 'discipline';
    }

    if (this.includesAny(q, ['kiem tra', 'giam sat', 'tu kiem tra'])) {
      return 'inspection';
    }

    if (this.includesAny(q, ['ket nap', 'vao dang', 'cong nhan chinh thuc'])) {
      return 'admission';
    }

    if (this.includesAny(q, ['the dang vien', 'ho so dang vien', 'ly lich dang vien'])) {
      return 'profile';
    }

    if (this.includesAny(q, ['sinh hoat chi bo', 'hop chi bo'])) {
      return 'meeting';
    }

    if (this.includesAny(q, ['chi bo', 'dang uy', 'chi uy'])) {
      return 'organization';
    }

    if (this.includesAny(q, ['thu tuc', 'quy trinh', 'trinh tu'])) {
      return 'procedure';
    }

    if (this.includesAny(q, ['quy dinh', 'dieu le', 'trach nhiem'])) {
      return 'policy';
    }

    return 'general';
  }

  private getIntentProfile(intent: InternalIntent): IntentProfile {
    const profiles: Record<InternalIntent, IntentProfile> = {
      discipline: {
        mustHaveAny: ['vi pham', 'ky luat', 'thoi hieu', 'nguyen tac xu ly ky luat', 'khien trach', 'canh cao', 'cach chuc', 'khai tru'],
        positive: ['vi pham', 'ky luat', 'thi hanh ky luat', 'xu ly ky luat', 'nguyen tac xu ly ky luat', 'thoi hieu'],
        strongPositive: ['thoi hieu', 'nguyen tac xu ly ky luat', 'hinh thuc ky luat', 'khien trach', 'canh cao', 'cach chuc', 'xoa ten', 'khai tru'],
        negative: ['dang phi', 'muc dong', 'bao hiem xa hoi', 'thu nop dang phi'],
        hardNegative: ['che do dang phi', 'ket nap dang vien', 'ho so ket nap'],
        titleHints: ['quy dinh chung', 'nguyen tac xu ly ky luat', 'thoi hieu', 'ky luat', 'quy dinh'],
      },
      fee_policy: {
        mustHaveAny: ['dang phi', 'muc dong', 'thu nop', 'mien', 'tuoi dang', 'nuoc ngoai', 'bao hiem xa hoi', 'bhxh'],
        positive: ['dang phi', 'muc dong', 'che do dang phi', 'mien dong dang phi', 'tuoi dang', 'nuoc ngoai'],
        strongPositive: ['muc dong dang phi', 'mien dong dang phi', 'dong dang phi', 'phan bo dang phi', 'cong khai dang phi', 'quan ly dang phi', 'thu nop dang phi'],
        negative: ['ky luat', 'khai tru', 'xoa ten', 'khien trach', 'canh cao', 'cach chuc'],
        hardNegative: ['hinh thuc ky luat', 'vi pham ve chinh tri'],
        titleHints: ['dang phi', 'che do dang phi', 'muc dong dang phi', 'mien dong dang phi'],
      },
      admission: {
        mustHaveAny: ['ket nap', 'vao dang', 'nguoi xin vao dang'],
        positive: ['ket nap', 'vao dang', 'dang vien du bi', 'cong nhan chinh thuc'],
        strongPositive: ['ho so ket nap', 'le ket nap', 'chi bo de nghi'],
        negative: ['dang phi'],
        hardNegative: ['che do dang phi'],
        titleHints: ['ket nap', 'dieu le', 'thi hanh dieu le'],
      },
      procedure: {
        mustHaveAny: ['thu tuc', 'quy trinh', 'trinh tu', 'ho so'],
        positive: ['thu tuc', 'quy trinh', 'trinh tu', 'ho so'],
        strongPositive: ['thanh phan ho so', 'cac buoc'],
        negative: [],
        hardNegative: [],
        titleHints: ['huong dan', 'thi hanh dieu le'],
      },
      document: {
        mustHaveAny: ['van ban', 'tai lieu', 'quyet dinh', 'nghi quyet', 'huong dan'],
        positive: ['van ban', 'tai lieu', 'quyet dinh', 'nghi quyet', 'huong dan'],
        strongPositive: [],
        negative: [],
        hardNegative: [],
        titleHints: ['quy dinh', 'huong dan', 'nghi quyet'],
      },
      profile: {
        mustHaveAny: ['ho so dang vien', 'ly lich dang vien', 'the dang vien', 'chuyen sinh hoat dang'],
        positive: ['ho so dang vien', 'ly lich dang vien', 'the dang vien'],
        strongPositive: ['mat the dang vien', 'cap lai the dang vien', 'phat the dang vien', 'chuyen sinh hoat dang'],
        negative: ['dang phi', 'ket nap'],
        hardNegative: ['che do dang phi'],
        titleHints: ['ho so dang vien', 'the dang vien', 'thi hanh dieu le'],
      },
      meeting: {
        mustHaveAny: ['sinh hoat chi bo', 'sinh hoat dang', 'hop chi bo'],
        positive: ['sinh hoat chi bo', 'hop chi bo', 'sinh hoat dinh ky'],
        strongPositive: ['tham gia sinh hoat', 'nghia vu tham gia sinh hoat', 'vang mat'],
        negative: [],
        hardNegative: [],
        titleHints: ['sinh hoat chi bo'],
      },
      organization: {
        mustHaveAny: ['chi bo', 'dang uy', 'chi uy', 'to chuc dang'],
        positive: ['chi bo', 'dang uy', 'chi uy', 'bi thu'],
        strongPositive: ['tham quyen', 'to chuc dang'],
        negative: [],
        hardNegative: [],
        titleHints: ['dieu le', 'to chuc dang'],
      },
      policy: {
        mustHaveAny: ['quy dinh', 'dieu le', 'trach nhiem', 'nghia vu'],
        positive: ['quy dinh', 'dieu le', 'trach nhiem', 'nghia vu'],
        strongPositive: ['nguyen tac', 'bat buoc'],
        negative: [],
        hardNegative: [],
        titleHints: ['quy dinh', 'dieu le', 'huong dan'],
      },
      inspection: {
        mustHaveAny: ['kiem tra', 'giam sat', 'tu kiem tra'],
        positive: ['kiem tra', 'giam sat', 'tu kiem tra', 'cong tac kiem tra'],
        strongPositive: ['kiem tra cua cap tren', 'ket qua kiem tra', 'ket qua giam sat', 'tu kiem tra cua can bo dang vien'],
        negative: ['dang phi', 'ket nap', 'ho so dang vien', 'chuyen sinh hoat'],
        hardNegative: ['che do dang phi', 'quy trinh thu tuc ket nap', 'phieu bo sung ho so'],
        titleHints: ['kiem tra', 'giam sat'],
      },
      general: {
        mustHaveAny: [],
        positive: ['quy dinh', 'huong dan', 'dang vien', 'chi bo'],
        strongPositive: [],
        negative: [],
        hardNegative: [],
        titleHints: [],
      },
    };

    return profiles[intent];
  }

  private getDynamicMustHaveKeywords(query: string, intent: InternalIntent): string[] {
    const q = this.normalizeText(query);
    const must = new Set<string>();

    /**
     * Cac tu khoa bat buoc nen la tu phan biet nhat cua cau hoi,
     * khong nen dung keyword qua chung nhu "ky luat" hoac "dang phi".
     */
    if (intent === 'fee_policy') {
      if (q.includes('nuoc ngoai')) return ['nuoc ngoai'];
      if (q.includes('trong nuoc')) return ['trong nuoc'];
      if (q.includes('mien') || q.includes('tuoi dang')) {
        if (q.includes('tuoi dang')) return ['tuoi dang'];
        return ['mien'];
      }
      if (q.includes('phan bo')) return ['phan bo'];
      if (q.includes('sap xep') || q.includes('sap nhap') || q.includes('chia tach') || q.includes('giai the')) {
        return ['sap xep', 'sap nhap', 'chia tach', 'giai the'];
      }
      if (q.includes('muc dong')) return ['muc dong'];
    }

    if (intent === 'discipline') {
      if (q.includes('thoi hieu')) return ['thoi hieu'];
      if (q.includes('nghi huu')) return ['nghi huu'];
      if (q.includes('thoi chuc')) return ['thoi chuc'];
      if (q.includes('khong con cong tac')) return ['khong con cong tac'];
    }

    if (q.includes('tuyen truyen') || q.includes('phat ngon')) {
      must.add('tuyen truyen');
      must.add('phat ngon');
      return [...must];
    }

    if (q.includes('tu kiem tra') || q.includes('cap tren')) {
      must.add('kiem tra');
      must.add('tu kiem tra');
      return [...must];
    }

    if (q.includes('the dang vien')) {
      must.add('the dang vien');
      return [...must];
    }

    if (q.includes('sinh hoat chi bo')) {
      must.add('sinh hoat chi bo');
      return [...must];
    }

    if (q.includes('dang vien du bi')) {
      must.add('dang vien du bi');
      return [...must];
    }

    const profile = this.getIntentProfile(intent);
    return profile.mustHaveAny;
  }

  private buildWeightedPhrases(
    rawQuery: string,
    queryVariants: string[],
    intent: InternalIntent,
  ): Array<{ phrase: string; weight: number }> {
    const phrases = new Map<string, number>();

    const add = (phrase: string, weight: number) => {
      const normalized = this.normalizeText(phrase);
      if (!normalized) return;
      phrases.set(normalized, Math.max(phrases.get(normalized) ?? 0, weight));
    };

    for (const phrase of this.extractMeaningfulPhrases(rawQuery)) add(phrase, 2.8);
    for (const variant of queryVariants) {
      for (const phrase of this.extractMeaningfulPhrases(variant)) add(phrase, 1.4);
    }

    const profile = this.getIntentProfile(intent);

    for (const phrase of profile.positive) add(phrase, 2.2);
    for (const phrase of profile.strongPositive) add(phrase, 4.2);
    for (const phrase of profile.titleHints) add(phrase, 2.0);

    if (intent === 'discipline') {
      add('vi pham ve tuyen truyen phat ngon', 8);
      add('tuyen truyen phat ngon', 7);
      add('vi pham ve chinh tri', 5);
      add('hinh thuc ky luat doi voi dang vien du bi', 7);
    }

    if (intent === 'inspection') {
      add('kiem tra cua cap tren va tu kiem tra', 8);
      add('tu kiem tra cua can bo dang vien', 7);
      add('ket qua giam sat', 5);
    }

    return [...phrases.entries()].map(([phrase, weight]) => ({ phrase, weight }));
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
        phraseScore += 3.5;
        matchedPhrases.push(quoted);
      }
    }

    return { phraseScore, matchedPhrases };
  }

  private computeQuerySpecificScore(
    intent: InternalIntent,
    normalizedQuery: string,
    text: string,
  ): number {
    let score = 0;
    const has = (term: string) => normalizedQuery.includes(term);
    const textHas = (term: string) => text.includes(term);

    if (intent === 'fee_policy') {
      const asksAmount = this.includesAny(normalizedQuery, [
        'muc dong',
        'dong bao nhieu',
        'bao nhieu tien',
        'ty le dong',
        'phan tram',
      ]);
      const asksForeign = has('nuoc ngoai');
      const asksExemption = this.includesAny(normalizedQuery, [
        'mien',
        'mien dong',
        'duoc mien',
        'khong phai dong',
        'tuoi dang',
        'nam tuoi dang',
      ]);
      const asksAllocation = has('phan bo');
      const asksReorg = this.includesAny(normalizedQuery, [
        'sap xep lai',
        'sap xep',
        'sap nhap',
        'chia tach',
        'giai the',
        'to chuc dang',
      ]);

      if (asksAmount && textHas('muc dong')) score += 8;
      if (asksForeign && textHas('nuoc ngoai')) score += 12;
      if (asksForeign && textHas('muc dong dang phi doi voi dang vien o nuoc ngoai')) score += 10;
      if (asksExemption && (textHas('mien') || textHas('mien dong'))) score += 12;
      if (has('tuoi dang') && textHas('tuoi dang')) score += 10;
      if (asksAllocation && textHas('phan bo')) score += 10;
      if (asksReorg && this.includesAny(text, ['sap xep', 'sap nhap', 'chia tach', 'giai the'])) score += 10;

      if ((asksAmount || asksExemption) && textHas('quan ly su dung dang phi')) score -= 10;
      if ((asksAmount || asksExemption) && textHas('dieu 7')) score -= 8;
      if (asksForeign && !textHas('nuoc ngoai')) score -= 6;
      if (asksExemption && !this.includesAny(text, ['mien', 'tuoi dang'])) score -= 6;
    }

    if (intent === 'discipline') {
      const asksLimitation = this.includesAny(normalizedQuery, ['thoi hieu', 'bao lau', 'thoi han']);
      const asksRetired = this.includesAny(normalizedQuery, ['nghi huu', 'thoi chuc', 'khong con cong tac']);
      const asksSpecificViolation = this.includesAny(normalizedQuery, ['tuyen truyen', 'phat ngon', 'bao mat', 'van bang', 'tin nguong']);

      if (asksLimitation && textHas('thoi hieu')) score += 14;
      if (asksLimitation && textHas('nguyen tac xu ly ky luat')) score += 8;
      if (asksLimitation && this.includesAny(text, ['canh cao', 'cach chuc', 'khien trach'])) score += 4;

      if (asksRetired && textHas('nghi huu')) score += 14;
      if (asksRetired && this.includesAny(text, ['thoi chuc', 'khong con cong tac'])) score += 10;
      if (asksRetired && this.includesAny(text, ['doi tuong ap dung', 'pham vi ap dung', 'quy dinh chung'])) score += 6;

      if ((asksLimitation || asksRetired) && !asksSpecificViolation) {
        if (textHas('vi pham ve tuyen truyen phat ngon')) score -= 12;
        if (this.includesAny(text, ['dieu 10', 'dieu 12', 'dieu 13', 'dieu 22', 'dieu 34'])) score -= 8;
        if (textHas('vi pham ve') && !this.includesAny(text, ['thoi hieu', 'nghi huu', 'quy dinh chung'])) score -= 6;
      }

      if (asksSpecificViolation && textHas('vi pham ve')) score += 6;
    }

    return score;
  }

  private computeGateScore(text: string, mustKeywords: string[]): number {
    if (!mustKeywords.length) return 0.5;

    const matched = mustKeywords.filter((kw) => text.includes(kw)).length;
    if (matched === 0) return 0;

    return matched / mustKeywords.length;
  }

  private computeIntentScore(intent: InternalIntent, text: string): number {
    const profile = this.getIntentProfile(intent);
    let score = 0;

    for (const term of profile.positive) if (text.includes(term)) score += 1.4;
    for (const term of profile.strongPositive) if (text.includes(term)) score += 3.0;
    for (const hint of profile.titleHints) if (text.includes(hint)) score += 1.0;

    if (intent === 'discipline') {
      if (text.includes('thoi hieu')) score += 4;
      if (text.includes('nguyen tac xu ly ky luat')) score += 3;
      if (text.includes('tuyen truyen')) score += 2;
      if (text.includes('phat ngon')) score += 2;
      if (text.includes('vi pham ve chinh tri')) score += 2;
    }

    if (intent === 'inspection') {
      if (text.includes('kiem tra')) score += 3;
      if (text.includes('giam sat')) score += 3;
      if (text.includes('tu kiem tra')) score += 3;
      if (text.includes('cap tren')) score += 2;
    }

    return Math.min(score, 18);
  }

  private computePenaltyScore(intent: InternalIntent, text: string): number {
    const profile = this.getIntentProfile(intent);
    let penalty = 0;

    for (const term of profile.negative) if (text.includes(term)) penalty += 3.5;
    for (const term of profile.hardNegative) if (text.includes(term)) penalty += 8;

    if (intent === 'discipline') {
      if (text.includes('che do dang phi')) penalty += 8;
      if (text.includes('quy trinh thu tuc ket nap')) penalty += 7;
      if (text.includes('quan ly ho so dang vien')) penalty += 5;
    }

    if (intent === 'inspection') {
      if (text.includes('ket nap dang vien')) penalty += 8;
      if (text.includes('dang phi')) penalty += 8;
      if (text.includes('chuyen sinh hoat dang')) penalty += 6;
    }

    return penalty;
  }

  private computeStructureScore(row: RetrievalRow, intent: InternalIntent, wholeText: string): number {
    let score = 0;

    if (row.sectionPath) score += 0.7;
    if (wholeText.includes('dieu ')) score += 0.9;
    if (wholeText.includes('khoan ')) score += 0.7;
    if (wholeText.includes('muc ')) score += 0.4;

    if (intent === 'discipline' && wholeText.includes('quy dinh chung')) score += 1.8;
    if (intent === 'discipline' && wholeText.includes('nguyen tac xu ly ky luat')) score += 2.2;
    if (intent === 'discipline' && wholeText.includes('thoi hieu')) score += 2.5;
    if (intent === 'discipline' && wholeText.includes('vi pham')) score += 0.8;
    if (intent === 'inspection' && wholeText.includes('kiem tra')) score += 1.8;
    if (intent === 'inspection' && wholeText.includes('giam sat')) score += 1.8;
    if (intent === 'fee_policy' && wholeText.includes('dang phi')) score += 1.5;
    if (intent === 'profile' && wholeText.includes('the dang vien')) score += 1.5;
    if (intent === 'meeting' && wholeText.includes('sinh hoat chi bo')) score += 1.5;

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

    if (ratio >= 0.85) return 2.8;
    if (ratio >= 0.65) return 2.2;
    if (ratio >= 0.45) return 1.4;
    if (ratio >= 0.25) return 0.7;

    return 0;
  }

  private computeConfidenceScore(params: {
    semanticScore: number;
    rerankScore: number;
    coverageScore: number;
    phraseScore: number;
    intentScore: number;
    gateScore: number;
    penaltyScore: number;
    matchedKeywordsCount: number;
    keywordCount: number;
    rawQuery?: string;
    contentText?: string;
  }): number {
    const keywordRatio =
      params.keywordCount > 0
        ? params.matchedKeywordsCount / params.keywordCount
        : 0;

    const normalizedRerank = Math.min(1, Math.max(0, params.rerankScore) / 20);
    const normalizedPhrase = Math.min(1, params.phraseScore / 10);
    const normalizedIntent = Math.min(1, params.intentScore / 12);
    const normalizedCoverage = Math.min(1, params.coverageScore / 2.8);
    const normalizedPenalty = Math.min(1, params.penaltyScore / 10);

    let confidence =
      params.semanticScore * 0.14 +
      normalizedRerank * 0.24 +
      normalizedCoverage * 0.14 +
      normalizedPhrase * 0.16 +
      normalizedIntent * 0.14 +
      params.gateScore * 0.22 +
      keywordRatio * 0.1 -
      normalizedPenalty * 0.25;

    if (params.rawQuery && params.contentText) {
      const query = this.normalizeText(params.rawQuery);
      const content = this.normalizeText(params.contentText);

      if (query.includes('tuyen truyen') && !content.includes('tuyen truyen')) confidence *= 0.35;
      if (query.includes('phat ngon') && !content.includes('phat ngon')) confidence *= 0.35;
      if (query.includes('tu kiem tra') && !content.includes('tu kiem tra')) confidence *= 0.45;
      if (query.includes('dang phi') && !content.includes('dang phi')) confidence *= 0.5;
      if (query.includes('the dang vien') && !content.includes('the dang vien')) confidence *= 0.5;
      if (query.includes('sinh hoat chi bo') && !content.includes('sinh hoat chi bo')) confidence *= 0.5;
    }

    return this.roundNumber(this.clamp(confidence, 0, 1), 4);
  }

  private hasStrongIntentEvidence(row: RetrievalResult, intent: InternalIntent): boolean {
    const text = this.normalizeText(
      `${row.documentTitle ?? ''} ${row.sectionPath ?? ''} ${row.content ?? ''}`,
    );

    if (intent === 'discipline') {
      return (
        text.includes('thoi hieu') ||
        text.includes('nguyen tac xu ly ky luat') ||
        text.includes('xem xet ky luat') ||
        (
          text.includes('vi pham') &&
          (
            text.includes('ky luat') ||
            text.includes('tuyen truyen') ||
            text.includes('phat ngon') ||
            text.includes('khien trach') ||
            text.includes('canh cao') ||
            text.includes('cach chuc') ||
            text.includes('khai tru')
          )
        )
      );
    }

    if (intent === 'inspection') {
      return text.includes('kiem tra') || text.includes('giam sat');
    }

    if (intent === 'fee_policy') return text.includes('dang phi');
    if (intent === 'profile') return text.includes('ho so dang vien') || text.includes('the dang vien');
    if (intent === 'meeting') return text.includes('sinh hoat chi bo') || text.includes('sinh hoat dang');

    return row.confidenceScore >= 0.42;
  }

  private isClearlyWrongDomain(row: RetrievalResult, intent: InternalIntent): boolean {
    const text = this.normalizeText(
      `${row.documentTitle ?? ''} ${row.sectionPath ?? ''} ${row.content ?? ''}`,
    );

    if (intent === 'discipline') {
      return (
        (text.includes('che do dang phi') && !text.includes('vi pham')) ||
        (text.includes('quy trinh thu tuc ket nap') && !text.includes('vi pham')) ||
        (text.includes('ho so dang vien') && !text.includes('vi pham'))
      );
    }

    if (intent === 'inspection') {
      return (
        (text.includes('dang phi') || text.includes('ket nap dang vien') || text.includes('chuyen sinh hoat dang')) &&
        !text.includes('kiem tra') &&
        !text.includes('giam sat')
      );
    }

    if (intent === 'fee_policy') {
      return text.includes('hinh thuc ky luat') && !text.includes('dang phi');
    }

    return false;
  }

  private includesAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'la', 'va', 'cua', 'cho', 'voi', 'tai', 'theo', 'nhung', 'duoc',
      'bao', 'nhieu', 'co', 'khong', 'gi', 'nao', 'khi', 'thi', 'mot',
      'cac', 'nguoi', 'truong', 'hop', 've', 'nay', 'kia', 'tu', 'den',
      'da', 'bi', 'hay', 'ra', 'o', 'lam', 'cach', 'sao', 'the', 'nhu',
      'phai', 'doi', 'voi', 'trong', 'qua', 'trinh',
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
    return terms.filter((term) => text.includes(term)).length;
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
      const biGram = words.slice(i, i + 2).join(' ').trim();
      const triGram = words.slice(i, i + 3).join(' ').trim();
      const fourGram = words.slice(i, i + 4).join(' ').trim();
      const fiveGram = words.slice(i, i + 5).join(' ').trim();

      if (biGram.split(' ').length === 2 && !this.isWeakPhrase(biGram)) phrases.add(biGram);
      if (triGram.split(' ').length === 3 && !this.isWeakPhrase(triGram)) phrases.add(triGram);
      if (fourGram.split(' ').length === 4 && !this.isWeakPhrase(fourGram)) phrases.add(fourGram);
      if (fiveGram.split(' ').length === 5 && !this.isWeakPhrase(fiveGram)) phrases.add(fiveGram);
    }

    return [...phrases];
  }

  private isWeakPhrase(phrase: string): boolean {
    const weakTokens = new Set([
      'la', 'gi', 'co', 'khong', 'the', 'nao', 'bao', 'nhieu',
      'cach', 'lam', 'ra', 'vao', 'phai', 'thi', 'doi', 'voi',
    ]);

    const tokens = phrase.split(' ').filter(Boolean);
    const meaningful = tokens.filter((token) => !weakTokens.has(token));

    return meaningful.length < Math.min(2, tokens.length);
  }

  private normalizeRawQuery(query: string): string {
    return (query ?? '')
      .normalize('NFC')
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/[?!.。]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeText(input: string): string {
    return this.removeVietnameseTones(
      (input ?? '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
        .replace(/[?!.。]+$/g, '')
        .replace(/[,:;()[\]{}<>]/g, ' ')
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
    source: 'semantic' | 'lexical' | 'exact' | 'neighbor',
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

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }

  private roundNumber(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}