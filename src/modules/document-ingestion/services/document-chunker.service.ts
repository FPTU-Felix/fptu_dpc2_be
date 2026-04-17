import { Injectable } from '@nestjs/common';

type ChunkInput = {
  text: string;
  pageMap?: Array<{
    pageNumber: number;
    text: string;
  }>;
  documentTitle?: string;
  maxWords?: number;
  overlapWords?: number;
  minWords?: number;
};

type ChunkOutput = {
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  sectionPath?: string;
  tokenCount?: number; // giữ tên cũ để tương thích; hiện tại là word count
  metadata?: Record<string, any>;
};

type HeadingType =
  | 'phan'
  | 'chuong'
  | 'muc'
  | 'tieu_muc'
  | 'dieu'
  | 'khoan'
  | 'diem'
  | 'gach_dau_dong'
  | 'tieu_de_in_hoa';

type HeadingInfo = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  type: HeadingType;
  code?: string;
};

type SectionBlock = {
  headingPath: string[];
  headingInfoPath: HeadingInfo[];
  contentLines: string[];
};

@Injectable()
export class DocumentChunkerService {
  private static readonly MAX_SECTION_PATH_LENGTH = 1000;
  private static readonly MAX_HEADING_LINE_LENGTH = 220;
  private static readonly MAX_HEADING_WORDS = 28;

  chunkText(input: ChunkInput): ChunkOutput[] {
    const normalizedText = this.normalizeText(input.text);
    if (!normalizedText) {
      return [];
    }

    const maxWords = this.clampNumber(input.maxWords, 220, 80, 500);
    const overlapWords = this.clampNumber(input.overlapWords, 30, 0, 120);
    const minWords = this.clampNumber(input.minWords, 40, 8, 120);

    const lines = this.toMeaningfulLines(normalizedText);
    if (!lines.length) {
      return [];
    }

    const sectionBlocks = this.buildSectionBlocks(lines);
    if (!sectionBlocks.length) {
      return [];
    }

    const chunks = this.sectionsToChunks(sectionBlocks, {
      maxWords,
      overlapWords,
      minWords,
      pageMap: input.pageMap,
      documentTitle: input.documentTitle,
    });

    return this.reindexChunks(chunks);
  }

  private clampNumber(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.min(Math.max(value, min), max);
  }

  private normalizeText(text: string): string {
    return (text ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[‐-‒–—]/g, '-')
      .trim();
  }

  private toMeaningfulLines(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private buildSectionBlocks(lines: string[]): SectionBlock[] {
    const blocks: SectionBlock[] = [];
    const headingStack: HeadingInfo[] = [];
    let currentBlock: SectionBlock | null = null;

    const flushCurrentBlock = () => {
      if (!currentBlock) {
        return;
      }

      const contentLines = currentBlock.contentLines
        .map((item) => item.trim())
        .filter(Boolean);

      if (contentLines.length > 0) {
        blocks.push({
          headingPath: [...currentBlock.headingPath],
          headingInfoPath: [...currentBlock.headingInfoPath],
          contentLines,
        });
      }

      currentBlock = null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const heading = this.parseHeading(line);

      if (heading) {
        flushCurrentBlock();

        if (this.isStructuralHeading(heading)) {
          while (
            headingStack.length > 0 &&
            headingStack[headingStack.length - 1].level >= heading.level
          ) {
            headingStack.pop();
          }

          headingStack.push(heading);
        }

        currentBlock = {
          headingPath: this.buildSafeHeadingPath(headingStack),
          headingInfoPath: [...headingStack],
          contentLines: [],
        };

        if (!this.isStructuralHeading(heading)) {
          currentBlock.contentLines.push(line);
        }

        continue;
      }

      if (!currentBlock) {
        currentBlock = {
          headingPath: this.buildSafeHeadingPath(headingStack),
          headingInfoPath: [...headingStack],
          contentLines: [],
        };
      }

      currentBlock.contentLines.push(line);
    }

    flushCurrentBlock();

    if (!blocks.length && lines.length) {
      blocks.push({
        headingPath: [],
        headingInfoPath: [],
        contentLines: [...lines],
      });
    }

    return blocks;
  }

  private parseHeading(line: string): HeadingInfo | null {
    const normalized = this.normalizeHeadingLine(line);
    if (!normalized) {
      return null;
    }

    if (!this.isPlausibleHeadingLine(normalized)) {
      return null;
    }

    const partMatch = normalized.match(/^PHẦN\s+([IVXLCDM0-9A-ZĂÂĐÊÔƠƯ]+)/iu);
    if (partMatch && this.isLikelyHeadingText(normalized, 'phan')) {
      return {
        level: 1,
        text: normalized,
        type: 'phan',
        code: partMatch[1],
      };
    }

    const chapterMatch = normalized.match(/^CHƯƠNG\s+([IVXLCDM0-9A-ZĂÂĐÊÔƠƯ]+)/iu);
    if (chapterMatch && this.isLikelyHeadingText(normalized, 'chuong')) {
      return {
        level: 2,
        text: normalized,
        type: 'chuong',
        code: chapterMatch[1],
      };
    }

    const sectionMatch = normalized.match(/^MỤC\s+([IVXLCDM0-9]+)/iu);
    if (sectionMatch && this.isLikelyHeadingText(normalized, 'muc')) {
      return {
        level: 3,
        text: normalized,
        type: 'muc',
        code: sectionMatch[1],
      };
    }

    const subsectionMatch = normalized.match(/^TIỂU\s+MỤC\s+([IVXLCDM0-9]+)/iu);
    if (subsectionMatch && this.isLikelyHeadingText(normalized, 'tieu_muc')) {
      return {
        level: 4,
        text: normalized,
        type: 'tieu_muc',
        code: subsectionMatch[1],
      };
    }

    const articleMatch = normalized.match(/^ĐIỀU\s+(\d+)(?:[.:]\s*|\s+)/iu);
    if (articleMatch && this.isLikelyHeadingText(normalized, 'dieu')) {
      return {
        level: 4,
        text: normalized,
        type: 'dieu',
        code: articleMatch[1],
      };
    }

    const clauseMatch = normalized.match(/^KHOẢN\s+(\d+)(?:[.:]\s*|\s+)/iu);
    if (clauseMatch && this.isLikelyHeadingText(normalized, 'khoan')) {
      return {
        level: 5,
        text: normalized,
        type: 'khoan',
        code: clauseMatch[1],
      };
    }

    const pointMatch = normalized.match(/^ĐIỂM\s+([a-zA-ZđĐ])(?:[):.]\s*|\s+)/u);
    if (pointMatch && this.isLikelyHeadingText(normalized, 'diem')) {
      return {
        level: 6,
        text: normalized,
        type: 'diem',
        code: pointMatch[1],
      };
    }

    const numberedClauseMatch = normalized.match(/^(\d{1,3})[.)]\s+\S+/u);
    if (
      numberedClauseMatch &&
      this.isLikelyHeadingText(normalized, 'khoan') &&
      this.isTerseListMarker(normalized)
    ) {
      return {
        level: 5,
        text: normalized,
        type: 'khoan',
        code: numberedClauseMatch[1],
      };
    }

    const numberedPointMatch = normalized.match(
      /^(\d{1,3}(?:\.\d{1,3})+)[.)]?\s+\S+/u,
    );
    if (
      numberedPointMatch &&
      this.isLikelyHeadingText(normalized, 'diem') &&
      this.isTerseListMarker(normalized)
    ) {
      return {
        level: 6,
        text: normalized,
        type: 'diem',
        code: numberedPointMatch[1],
      };
    }

    const alphaPointMatch = normalized.match(/^([a-zA-ZđĐ])[.)]\s+\S+/u);
    if (
      alphaPointMatch &&
      this.isLikelyHeadingText(normalized, 'diem') &&
      this.isTerseListMarker(normalized)
    ) {
      return {
        level: 6,
        text: normalized,
        type: 'diem',
        code: alphaPointMatch[1],
      };
    }

    if (/^[-•+*]\s+\S+/u.test(normalized) && this.isSafeBulletHeading(normalized)) {
      return {
        level: 6,
        text: normalized,
        type: 'gach_dau_dong',
      };
    }

    if (this.looksLikeStandaloneUppercaseHeading(normalized)) {
      return {
        level: 3,
        text: normalized,
        type: 'tieu_de_in_hoa',
      };
    }

    return null;
  }

  private normalizeHeadingLine(line: string): string {
    return line.replace(/\s+/g, ' ').trim();
  }

  private isPlausibleHeadingLine(line: string): boolean {
    if (!line) {
      return false;
    }

    if (line.length > DocumentChunkerService.MAX_HEADING_LINE_LENGTH) {
      return false;
    }

    if (this.countWords(line) > DocumentChunkerService.MAX_HEADING_WORDS) {
      return false;
    }

    return true;
  }

  private isLikelyHeadingText(
    line: string,
    type: Exclude<HeadingType, 'gach_dau_dong' | 'tieu_de_in_hoa'>,
  ): boolean {
    if (!this.isPlausibleHeadingLine(line)) {
      return false;
    }

    const normalized = line.replace(/\s+/g, ' ').trim();

    if (/[;!?]/u.test(normalized)) {
      return false;
    }

    const punctuationCount = (normalized.match(/[,:]/g) ?? []).length;
    if (punctuationCount > 4) {
      return false;
    }

    const wordCount = this.countWords(normalized);

    switch (type) {
      case 'phan':
      case 'chuong':
      case 'muc':
      case 'tieu_muc':
        return wordCount <= 18;

      case 'dieu':
        return wordCount <= 32;

      case 'khoan':
      case 'diem':
        return wordCount <= 24;

      default:
        return false;
    }
  }

  private isTerseListMarker(line: string): boolean {
    const wordCount = this.countWords(line);
    if (wordCount > 18) {
      return false;
    }

    if (/[;!?]/u.test(line)) {
      return false;
    }

    return true;
  }

  private isSafeBulletHeading(line: string): boolean {
    const withoutMarker = line.replace(/^[-•+*]\s+/u, '').trim();

    if (!withoutMarker) {
      return false;
    }

    if (withoutMarker.length > 120) {
      return false;
    }

    if (this.countWords(withoutMarker) > 16) {
      return false;
    }

    if (/[;.!?]/u.test(withoutMarker)) {
      return false;
    }

    return true;
  }

  private looksLikeStandaloneUppercaseHeading(line: string): boolean {
    if (line.length < 5 || line.length > 140) {
      return false;
    }

    if (
      /[a-zàáạảãăắằặẳẵâấầậẩẫèéẹẻẽêếềệểễìíịỉĩòóọỏõôốồộổỗơớờợởỡùúụủũưứừựửữỳýỵỷỹ]/u.test(
        line,
      )
    ) {
      return false;
    }

    const lettersOnly = line.replace(
      /[^A-ZÀÁẠẢÃĂẮẰẶẲẴÂẤẦẬẨẪĐÈÉẸẺẼÊẾỀỆỂỄÌÍỊỈĨÒÓỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠÙÚỤỦŨƯỨỪỰỬỮỲÝỴỶỸ ]/gu,
      '',
    );
    const words = lettersOnly.split(/\s+/).filter(Boolean);

    return words.length >= 2 && words.length <= 20;
  }

  private isStructuralHeading(heading: HeadingInfo): boolean {
    return heading.type !== 'gach_dau_dong';
  }

  private buildSafeHeadingPath(headingStack: HeadingInfo[]): string[] {
    return headingStack
      .filter((item) => this.isStructuralHeading(item))
      .map((item) => this.normalizeSectionPathPart(item.text))
      .filter(Boolean) as string[];
  }

  private normalizeSectionPathPart(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return null;
    }

    if (cleaned.length > 180) {
      return cleaned.slice(0, 180).trim();
    }

    return cleaned;
  }

  private sanitizeSectionPath(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return undefined;
    }

    if (cleaned.length > DocumentChunkerService.MAX_SECTION_PATH_LENGTH) {
      return cleaned.slice(0, DocumentChunkerService.MAX_SECTION_PATH_LENGTH).trim();
    }

    return cleaned;
  }

  private sectionsToChunks(
    sections: SectionBlock[],
    params: {
      maxWords: number;
      overlapWords: number;
      minWords: number;
      pageMap?: Array<{ pageNumber: number; text: string }>;
      documentTitle?: string;
    },
  ): ChunkOutput[] {
    const draftChunks: ChunkOutput[] = [];

    for (const section of sections) {
      const sectionText = section.contentLines.join('\n').trim();
      if (!sectionText) {
        continue;
      }

      const rawSectionPath = section.headingPath.join(' > ');
      const sectionPath = this.sanitizeSectionPath(rawSectionPath);
      const sectionMetadata = this.buildSectionMetadata(section);

      if (this.shouldKeepWholeAsProcedure(sectionText, params.maxWords)) {
        const procedureContent = this.joinHeadingAndContent(
          section.headingPath,
          sectionText,
        );

        if (!this.isLowValueChunk(procedureContent, params.minWords)) {
          draftChunks.push(
            this.buildChunk(procedureContent, {
              sectionPath,
              pageMap: params.pageMap,
              documentTitle: params.documentTitle,
              extraMetadata: {
                ...sectionMetadata,
                isProcedure: true,
                structureType: 'quy_trinh',
              },
            }),
          );
        }

        continue;
      }

      const pieces = this.splitSectionContent(
        section.contentLines,
        params.maxWords,
        params.overlapWords,
      );

      for (const piece of pieces) {
        const content = this.joinHeadingAndContent(
          section.headingPath,
          piece,
        ).trim();

        if (this.isLowValueChunk(content, params.minWords)) {
          continue;
        }

        draftChunks.push(
          this.buildChunk(content, {
            sectionPath,
            pageMap: params.pageMap,
            documentTitle: params.documentTitle,
            extraMetadata: {
              ...sectionMetadata,
              isProcedure: false,
              structureType: this.detectStructureType(piece),
            },
          }),
        );
      }
    }

    return this.mergeSmallNeighborChunks(
      draftChunks,
      params.minWords,
      params.maxWords,
    );
  }

  private buildSectionMetadata(section: SectionBlock): Record<string, any> {
    const headingInfoPath = section.headingInfoPath;

    const part = headingInfoPath.find((item) => item.type === 'phan');
    const chapter = headingInfoPath.find((item) => item.type === 'chuong');
    const sectionHeading = headingInfoPath.find((item) => item.type === 'muc');
    const subsection = headingInfoPath.find((item) => item.type === 'tieu_muc');
    const article = headingInfoPath.find((item) => item.type === 'dieu');
    const clause = headingInfoPath.find((item) => item.type === 'khoan');
    const point = headingInfoPath.find((item) => item.type === 'diem');

    return {
      maPhan: part?.code ?? null,
      maChuong: chapter?.code ?? null,
      maMuc: sectionHeading?.code ?? null,
      maTieuMuc: subsection?.code ?? null,
      soDieu: article?.code ?? null,
      soKhoan: clause?.code ?? null,
      maDiem: point?.code ?? null,
      loaiTieuDe: headingInfoPath.map((item) => item.type),
    };
  }

  private splitSectionContent(
    contentLines: string[],
    maxWords: number,
    overlapWords: number,
  ): string[] {
    const rawText = contentLines.join('\n').trim();
    const semanticBlocks = this.splitIntoSemanticBlocks(rawText);

    const chunks: string[] = [];
    let buffer: string[] = [];
    let bufferWords = 0;

    const flush = () => {
      if (!buffer.length) {
        return;
      }

      const combined = buffer.join('\n').trim();
      if (combined) {
        chunks.push(combined);
      }

      buffer = [];
      bufferWords = 0;
    };

    for (const block of semanticBlocks) {
      const blockWords = this.countWords(block);

      if (blockWords > maxWords) {
        flush();
        const smallerChunks = this.splitLargeBlock(
          block,
          maxWords,
          overlapWords,
        );
        chunks.push(...smallerChunks);
        continue;
      }

      if (bufferWords + blockWords <= maxWords) {
        buffer.push(block);
        bufferWords += blockWords;
        continue;
      }

      flush();
      buffer.push(block);
      bufferWords = blockWords;
    }

    flush();

    return chunks;
  }

  private splitIntoSemanticBlocks(text: string): string[] {
    const paragraphs = text
      .split(/\n{2,}/u)
      .map((item) => item.trim())
      .filter(Boolean);

    const blocks: string[] = [];

    for (const paragraph of paragraphs) {
      if (this.isListHeavyParagraph(paragraph)) {
        const listItems = this.splitListItems(paragraph);
        if (listItems.length > 1) {
          blocks.push(...listItems);
          continue;
        }
      }

      if (this.isLongLegalParagraph(paragraph)) {
        blocks.push(...this.splitLegalParagraph(paragraph));
        continue;
      }

      blocks.push(paragraph);
    }

    return blocks;
  }

  private isLongLegalParagraph(text: string): boolean {
    return (
      this.countWords(text) >= 120 &&
      (/^KHOẢN\s+\d+/iu.test(text) ||
        /^ĐIỂM\s+[a-zA-ZđĐ]/u.test(text) ||
        /^\d{1,3}[.)]\s+\S+/u.test(text))
    );
  }

  private splitLegalParagraph(text: string): string[] {
    const lines = text.split('\n').map((item) => item.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines;
    }

    const normalized = text.replace(/\s+/g, ' ').trim();
    const splitByInlineLegalMarkers = normalized
      .split(
        /(?=\bKHOẢN\s+\d+\b)|(?=\bĐIỂM\s+[a-zA-ZđĐ]\b)|(?=\d{1,3}[.)]\s)/iu,
      )
      .map((item) => item.trim())
      .filter(Boolean);

    return splitByInlineLegalMarkers.length > 1
      ? splitByInlineLegalMarkers
      : [text];
  }

  private isListHeavyParagraph(text: string): boolean {
    const lines = text.split('\n').map((item) => item.trim()).filter(Boolean);
    if (lines.length < 2) {
      return false;
    }

    const listLikeCount = lines.filter((line) => this.isListLikeLine(line)).length;
    return listLikeCount >= 2;
  }

  private splitListItems(text: string): string[] {
    const lines = text.split('\n').map((item) => item.trim()).filter(Boolean);
    const items: string[] = [];
    let currentItem: string[] = [];

    const flush = () => {
      if (!currentItem.length) {
        return;
      }

      items.push(currentItem.join('\n').trim());
      currentItem = [];
    };

    for (const line of lines) {
      if (this.isListLikeLine(line)) {
        flush();
        currentItem.push(line);
        continue;
      }

      if (!currentItem.length) {
        currentItem.push(line);
      } else {
        currentItem.push(line);
      }
    }

    flush();

    return items.length ? items : [text];
  }

  private isListLikeLine(line: string): boolean {
    return (
      /^\d{1,3}[.)]\s+\S+/u.test(line) ||
      /^\d{1,3}\.\d{1,3}(?:\.\d{1,3})*[.)]?\s+\S+/u.test(line) ||
      /^[a-zA-ZđĐ][.)]\s+\S+/u.test(line) ||
      /^[-•+*]\s+\S+/u.test(line) ||
      /^KHOẢN\s+\d+/iu.test(line) ||
      /^ĐIỂM\s+[a-zA-ZđĐ]/u.test(line) ||
      /^BƯỚC\s+\d+[.:]?\s*/iu.test(line)
    );
  }

  private splitLargeBlock(
    block: string,
    maxWords: number,
    overlapWords: number,
  ): string[] {
    const sentences = this.splitIntoSentences(block);
    if (sentences.length <= 1) {
      return this.slidingWindowByWords(block, maxWords, overlapWords);
    }

    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentWords = 0;

    const flush = () => {
      if (!currentChunk.length) {
        return;
      }

      const text = currentChunk.join(' ').trim();
      if (text) {
        chunks.push(text);
      }

      if (overlapWords <= 0) {
        currentChunk = [];
        currentWords = 0;
        return;
      }

      const overlapSentences: string[] = [];
      let overlapCount = 0;

      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const sentence = currentChunk[i];
        const wc = this.countWords(sentence);

        if (overlapCount + wc > overlapWords && overlapSentences.length > 0) {
          break;
        }

        overlapSentences.unshift(sentence);
        overlapCount += wc;

        if (overlapCount >= overlapWords) {
          break;
        }
      }

      currentChunk = overlapSentences;
      currentWords = overlapCount;
    };

    for (const sentence of sentences) {
      const sentenceWords = this.countWords(sentence);

      if (sentenceWords > maxWords) {
        flush();
        chunks.push(...this.slidingWindowByWords(sentence, maxWords, overlapWords));
        continue;
      }

      if (currentWords + sentenceWords <= maxWords) {
        currentChunk.push(sentence);
        currentWords += sentenceWords;
        continue;
      }

      flush();
      currentChunk.push(sentence);
      currentWords += sentenceWords;
    }

    flush();

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    const normalized = text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return [];
    }

    const parts = normalized
      .split(
        /(?<=[.!?])\s+(?=[A-ZÀÁẠẢÃĂẮẰẶẲẴÂẤẦẬẨẪĐÈÉẸẺẼÊẾỀỆỂỄÌÍỊỈĨÒÓỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠÙÚỤỦŨƯỨỪỰỬỮỲÝỴỶỸ0-9])/u,
      )
      .map((item) => item.trim())
      .filter(Boolean);

    return parts.length ? parts : [normalized];
  }

  private slidingWindowByWords(
    text: string,
    maxWords: number,
    overlapWords: number,
  ): string[] {
    const words = text.split(/\s+/u).filter(Boolean);
    if (!words.length) {
      return [];
    }

    const chunks: string[] = [];
    const step = Math.max(1, maxWords - overlapWords);

    for (let start = 0; start < words.length; start += step) {
      const end = Math.min(start + maxWords, words.length);
      const piece = words.slice(start, end).join(' ').trim();
      if (piece) {
        chunks.push(piece);
      }

      if (end >= words.length) {
        break;
      }
    }

    return chunks;
  }

  private shouldKeepWholeAsProcedure(text: string, maxWords: number): boolean {
    const wordCount = this.countWords(text);
    if (wordCount > maxWords) {
      return false;
    }

    const stepMatches = text.match(/\bBƯỚC\s+\d+\b/giu) ?? [];
    if (stepMatches.length >= 2) {
      return true;
    }

    const numberedLines = text
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => /^\d+[.)]\s+\S+/u.test(item));

    return numberedLines.length >= 3;
  }

  private joinHeadingAndContent(headingPath: string[], content: string): string {
    const headingText = this.sanitizeSectionPath(headingPath.join(' > ')) ?? '';
    return [headingText, content].filter(Boolean).join('\n\n').trim();
  }

  private detectStructureType(
    text: string,
  ): 'quy_trinh' | 'danh_sach' | 'menh_de_phap_ly' | 'doan_van' {
    if (/\bBƯỚC\s+\d+\b/iu.test(text)) {
      return 'quy_trinh';
    }

    if (
      /^KHOẢN\s+\d+/iu.test(text) ||
      /^ĐIỂM\s+[a-zA-ZđĐ]/u.test(text) ||
      /^\d{1,3}[.)]\s+\S+/u.test(text) ||
      /^\d{1,3}\.\d{1,3}(?:\.\d{1,3})*[.)]?\s+\S+/u.test(text)
    ) {
      return 'menh_de_phap_ly';
    }

    if (this.isListHeavyParagraph(text)) {
      return 'danh_sach';
    }

    return 'doan_van';
  }

  private mergeSmallNeighborChunks(
    chunks: ChunkOutput[],
    minWords: number,
    maxWords: number,
  ): ChunkOutput[] {
    if (!chunks.length) {
      return [];
    }

    const merged: ChunkOutput[] = [];

    for (const chunk of chunks) {
      const currentWords = this.countWords(chunk.content);
      const previous = merged[merged.length - 1];

      if (
        previous &&
        previous.sectionPath === chunk.sectionPath &&
        (currentWords < minWords || this.countWords(previous.content) < minWords) &&
        this.countWords(previous.content) + currentWords <= maxWords
      ) {
        previous.content = `${previous.content}\n${chunk.content}`.trim();
        previous.tokenCount = this.countWords(previous.content);
        previous.pageNumber = previous.pageNumber ?? chunk.pageNumber;
        previous.metadata = {
          ...(previous.metadata ?? {}),
          merged: true,
          wordCount: this.countWords(previous.content),
        };
        continue;
      }

      merged.push({ ...chunk });
    }

    return merged.map((item) => ({
      ...item,
      sectionPath: this.sanitizeSectionPath(item.sectionPath),
      tokenCount: this.countWords(item.content),
      metadata: {
        ...(item.metadata ?? {}),
        heading: this.sanitizeSectionPath(
          typeof item.metadata?.heading === 'string' ? item.metadata.heading : item.sectionPath,
        ) ?? null,
        wordCount: this.countWords(item.content),
      },
    }));
  }

  private isLowValueChunk(text: string, minWords: number): boolean {
    const normalized = text.trim();
    if (!normalized) {
      return true;
    }

    if (
      /^PHẦN\s+[IVXLCDM0-9]+[\s.:]*$/iu.test(normalized) ||
      /^CHƯƠNG\s+[IVXLCDM0-9]+[\s.:]*$/iu.test(normalized) ||
      /^MỤC\s+[IVXLCDM0-9]+[\s.:]*$/iu.test(normalized) ||
      /^TIỂU\s+MỤC\s+[IVXLCDM0-9]+[\s.:]*$/iu.test(normalized) ||
      /^ĐIỀU\s+\d+[\s.:]*$/iu.test(normalized) ||
      /^KHOẢN\s+\d+[\s.:]*$/iu.test(normalized) ||
      /^ĐIỂM\s+[a-zA-ZđĐ][\s.:]*$/u.test(normalized)
    ) {
      return true;
    }

    return this.countWords(normalized) < Math.min(minWords, 8);
  }

  private buildChunk(
    content: string,
    options: {
      sectionPath?: string;
      pageMap?: Array<{ pageNumber: number; text: string }>;
      documentTitle?: string;
      extraMetadata?: Record<string, any>;
    },
  ): ChunkOutput {
    const normalizedContent = content.trim();
    const wordCount = this.countWords(normalizedContent);
    const safeSectionPath = this.sanitizeSectionPath(options.sectionPath);

    return {
      chunkIndex: -1,
      content: normalizedContent,
      pageNumber: this.inferBestPageNumber(normalizedContent, options.pageMap),
      sectionPath: safeSectionPath,
      tokenCount: wordCount,
      metadata: {
        heading: safeSectionPath ?? null,
        documentTitle: options.documentTitle ?? null,
        wordCount,
        ...(options.extraMetadata ?? {}),
      },
    };
  }

  private inferBestPageNumber(
    chunkContent: string,
    pageMap?: Array<{ pageNumber: number; text: string }>,
  ): number | undefined {
    if (!pageMap?.length) {
      return undefined;
    }

    const chunkTokens = this.toSearchTokens(chunkContent);
    if (!chunkTokens.length) {
      return undefined;
    }

    let bestPageNumber: number | undefined;
    let bestScore = -1;

    for (const page of pageMap) {
      const pageTokens = new Set(this.toSearchTokens(page.text));
      if (!pageTokens.size) {
        continue;
      }

      let score = 0;
      for (const token of chunkTokens) {
        if (pageTokens.has(token)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestPageNumber = page.pageNumber;
      }
    }

    return bestScore > 0 ? bestPageNumber : pageMap[0]?.pageNumber;
  }

  private toSearchTokens(text: string): string[] {
    return this.normalizeVietnameseForSearch(text)
      .split(/\s+/u)
      .filter((token) => token.length >= 2)
      .slice(0, 160);
  }

  private normalizeVietnameseForSearch(text: string): string {
    return text
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private countWords(text: string): number {
    return (text ?? '').split(/\s+/u).filter(Boolean).length;
  }

  private reindexChunks(chunks: ChunkOutput[]): ChunkOutput[] {
    return chunks.map((chunk, index) => ({
      ...chunk,
      chunkIndex: index,
    }));
  }
}