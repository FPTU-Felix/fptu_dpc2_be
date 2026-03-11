import { Injectable } from '@nestjs/common';

type PageMapItem = { pageNumber: number; text: string };

type ChunkItem = {
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  sectionPath?: string;
  tokenCount?: number;
  metadata?: Record<string, any>;
};

type SectionBlock = {
  heading?: string;
  content: string;
};

@Injectable()
export class DocumentChunkerService {
  chunkText(params: {
    text: string;
    pageMap?: PageMapItem[];
    documentTitle?: string;
    maxWords?: number;
    overlapWords?: number;
  }): ChunkItem[] {
    const text = this.normalizeText(params.text);
    const maxWords = params.maxWords ?? 220;
    const overlapWords = params.overlapWords ?? 30;
    const documentTitle = params.documentTitle?.trim();

    if (!text) return [];

    // 1) Tách theo section có cấu trúc
    const sections = this.splitIntoSections(text);

    // 2) Pack section thành chunk vừa phải
    const chunks: ChunkItem[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      const packed = this.packSection(section, {
        maxWords,
        overlapWords,
        documentTitle,
      });

      for (const item of packed) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: item.content,
          pageNumber: this.findPageNumber(item.content, params.pageMap),
          sectionPath: item.sectionPath,
          tokenCount: this.estimateTokenCount(item.content),
          metadata: item.metadata,
        });
      }
    }

    return chunks;
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\u0000/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private splitIntoSections(text: string): SectionBlock[] {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const sections: SectionBlock[] = [];
    let currentHeading: string | undefined;
    let buffer: string[] = [];

    const flush = () => {
      if (!buffer.length) return;
      sections.push({
        heading: currentHeading,
        content: buffer.join('\n').trim(),
      });
      buffer = [];
    };

    for (const line of lines) {
      if (this.isHeading(line)) {
        flush();
        currentHeading = line;
      } else {
        buffer.push(line);
      }
    }

    flush();

    // fallback nếu không detect được heading
    if (!sections.length) {
      return [{ heading: undefined, content: text }];
    }

    return sections;
  }

  private isHeading(line: string): boolean {
    const normalized = line.trim();

    if (!normalized) return false;

    return (
      /^BƯỚC\s+\d+\s*:?/i.test(normalized) ||
      /^PHẦN\s+[IVXLC\d]+\s*:?/i.test(normalized) ||
      /^[IVXLC]+\.\s+/.test(normalized) ||
      /^\d+\.\s+/.test(normalized) ||
      /^(HƯỚNG DẪN|QUYỀN VÀ TRÁCH NHIỆM|LỜI TUYÊN THỆ|NGHỊ QUYẾT|GIẤY GIỚI THIỆU|ĐƠN XIN VÀO ĐẢNG|SƠ LƯỢC LÝ LỊCH)/i.test(
        normalized,
      ) ||
      // dòng in hoa tương đối ngắn thường là heading
      (normalized === normalized.toUpperCase() &&
        normalized.length <= 120 &&
        normalized.split(/\s+/).length <= 14)
    );
  }

  private packSection(
    section: SectionBlock,
    params: {
      maxWords: number;
      overlapWords: number;
      documentTitle?: string;
    },
  ): Array<{
    content: string;
    sectionPath?: string;
    metadata: Record<string, any>;
  }> {
    const paragraphs = section.content
      .split(/\n{2,}|\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (!paragraphs.length) {
      return [];
    }

    const results: Array<{
      content: string;
      sectionPath?: string;
      metadata: Record<string, any>;
    }> = [];

    let current: string[] = [];
    let currentWords = 0;

    const pushCurrent = () => {
      if (!current.length) return;

      const content = current.join('\n').trim();
      results.push({
        content,
        sectionPath: section.heading,
        metadata: {
          kind: this.classifySection(section.heading, content),
          heading: section.heading ?? null,
          hasStep: /^BƯỚC\s+\d+/i.test(section.heading ?? ''),
          wordCount: this.countWords(content),
          documentTitle: params.documentTitle ?? null,
        },
      });

      if (params.overlapWords > 0) {
        const overlapText = this.takeLastWords(content, params.overlapWords);
        current = overlapText ? [overlapText] : [];
        currentWords = this.countWords(overlapText);
      } else {
        current = [];
        currentWords = 0;
      }
    };

    for (const paragraph of paragraphs) {
      const pWords = this.countWords(paragraph);

      if (pWords > params.maxWords) {
        // paragraph quá dài -> cắt trong paragraph theo câu
        const sentenceChunks = this.splitLongParagraph(
          paragraph,
          params.maxWords,
          params.overlapWords,
        );

        for (const part of sentenceChunks) {
          if (current.length) {
            pushCurrent();
          }

          results.push({
            content: part,
            sectionPath: section.heading,
            metadata: {
              kind: this.classifySection(section.heading, part),
              heading: section.heading ?? null,
              hasStep: /^BƯỚC\s+\d+/i.test(section.heading ?? ''),
              wordCount: this.countWords(part),
              documentTitle: params.documentTitle ?? null,
            },
          });
        }

        current = [];
        currentWords = 0;
        continue;
      }

      if (currentWords + pWords > params.maxWords && current.length) {
        pushCurrent();
      }

      current.push(paragraph);
      currentWords += pWords;
    }

    pushCurrent();

    return results;
  }

  private splitLongParagraph(
    paragraph: string,
    maxWords: number,
    overlapWords: number,
  ): string[] {
    const sentences = paragraph
      .split(/(?<=[.!?;:])\s+|\s+(?=BƯỚC\s+\d+\s*:)/i)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!sentences.length) return [paragraph];

    const chunks: string[] = [];
    let current: string[] = [];
    let currentWords = 0;

    const pushCurrent = () => {
      if (!current.length) return;
      const content = current.join(' ').trim();
      chunks.push(content);

      const overlap = this.takeLastWords(content, overlapWords);
      current = overlap ? [overlap] : [];
      currentWords = this.countWords(overlap);
    };

    for (const sentence of sentences) {
      const sWords = this.countWords(sentence);

      if (currentWords + sWords > maxWords && current.length) {
        pushCurrent();
      }

      current.push(sentence);
      currentWords += sWords;
    }

    if (current.length) {
      chunks.push(current.join(' ').trim());
    }

    return chunks;
  }

  private classifySection(
    heading: string | undefined,
    content: string,
  ): string {
    const text = `${heading ?? ''} ${content}`.toLowerCase();

    if (text.includes('bước')) return 'procedure';
    if (text.includes('hồ sơ') || text.includes('lý lịch')) return 'document';
    if (text.includes('nghị quyết')) return 'resolution';
    if (text.includes('giấy giới thiệu')) return 'referral';
    if (text.includes('đảng phí')) return 'party_fee';
    if (text.includes('quyền') || text.includes('trách nhiệm')) return 'policy';
    if (text.includes('lễ kết nạp') || text.includes('lễ công nhận'))
      return 'ceremony';

    return 'general';
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }

  private estimateTokenCount(text: string): number {
    // gần đúng, đủ dùng để debug / filter
    return Math.ceil(this.countWords(text) * 1.3);
  }

  private takeLastWords(text: string, n: number): string {
    if (!text || n <= 0) return '';
    const words = text.split(/\s+/).filter(Boolean);
    return words.slice(-n).join(' ');
  }

  private findPageNumber(
    content: string,
    pageMap?: PageMapItem[],
  ): number | undefined {
    if (!pageMap?.length) return undefined;

    const probe = content.slice(0, 120).trim();
    if (!probe) return undefined;

    const matched = pageMap.find((p) => p.text.includes(probe));
    return matched?.pageNumber;
  }
}