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
  tokenCount?: number;
  metadata?: Record<string, any>;
};

type SectionBlock = {
  headingPath: string[];
  content: string;
  kind: 'section';
};

@Injectable()
export class DocumentChunkerService {
  chunkText(input: ChunkInput): ChunkOutput[] {
    const text = this.normalizeText(input.text);
    const maxWords = input.maxWords ?? 220;
    const overlapWords = input.overlapWords ?? 30;
    const minWords = input.minWords ?? 40;

    if (!text) {
      return [];
    }

    const lines = this.toMeaningfulLines(text);
    const sections = this.buildSectionBlocks(lines);
    const chunks = this.sectionsToChunks(sections, {
      maxWords,
      overlapWords,
      minWords,
      pageMap: input.pageMap,
      documentTitle: input.documentTitle,
    });

    return chunks;
  }

  private normalizeText(text: string): string {
    return (text ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private toMeaningfulLines(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private buildSectionBlocks(lines: string[]): SectionBlock[] {
    const sections: SectionBlock[] = [];

    let headingStack: string[] = [];
    let buffer: string[] = [];

    const flush = () => {
      const content = buffer.join('\n').trim();
      if (!content) {
        buffer = [];
        return;
      }

      sections.push({
        headingPath: [...headingStack],
        content,
        kind: 'section',
      });

      buffer = [];
    };

    for (const line of lines) {
      const heading = this.parseHeading(line);

      if (heading) {
        flush();
        headingStack = this.updateHeadingStack(headingStack, heading);
        continue;
      }

      buffer.push(line);
    }

    flush();

    if (!sections.length && lines.length) {
      sections.push({
        headingPath: [],
        content: lines.join('\n'),
        kind: 'section',
      });
    }

    return sections;
  }

  private parseHeading(
    line: string,
  ): { level: 1 | 2 | 3 | 4; text: string } | null {
    if (!line) return null;

    if (/^Phần\s+[IVXLC0-9]+[\s.: -]*/iu.test(line)) {
      return { level: 1, text: line };
    }

    if (/^Chương\s+[IVXLC0-9]+[\s.: -]*/iu.test(line)) {
      return { level: 2, text: line };
    }

    if (/^Mục\s+[IVXLC0-9]+[\s.: -]*/iu.test(line)) {
      return { level: 3, text: line };
    }

    if (/^Điều\s+\d+[\s.: -]*/iu.test(line)) {
      return { level: 4, text: line };
    }

    const clean = line.replace(/[0-9.:]/g, '').trim();
    const isAllCaps =
      clean.length >= 3 &&
      clean === clean.toUpperCase() &&
      /[A-ZÀ-Ỹ]/u.test(clean) &&
      clean.length <= 160;

    if (isAllCaps) {
      return { level: 2, text: line };
    }

    return null;
  }

  private updateHeadingStack(
    current: string[],
    heading: { level: 1 | 2 | 3 | 4; text: string },
  ): string[] {
    const next = [...current];

    switch (heading.level) {
      case 1:
        return [heading.text];
      case 2:
        return [next[0]].filter(Boolean).concat(heading.text);
      case 3:
        return [next[0], next[1]].filter(Boolean).concat(heading.text);
      case 4:
        return [next[0], next[1], next[2]].filter(Boolean).concat(heading.text);
      default:
        return [heading.text];
    }
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
    const chunks: ChunkOutput[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      const headingText = section.headingPath.join(' > ').trim();
      const combined = [headingText, section.content].filter(Boolean).join('\n\n');

      const splitParts = this.splitSmart(
        combined,
        params.maxWords,
        params.overlapWords,
      );

      for (const part of splitParts) {
        const normalized = part.trim();
        const wordCount = this.countWords(normalized);

        if (wordCount < params.minWords) {
          continue;
        }

        if (this.isLowValueChunk(normalized)) {
          continue;
        }

        chunks.push(
          this.makeChunk({
            chunkIndex: chunkIndex++,
            content: normalized,
            sectionPath: headingText || undefined,
            pageMap: params.pageMap,
            documentTitle: params.documentTitle,
            kind: section.kind,
          }),
        );
      }
    }

    return this.mergeSmallNeighborChunks(chunks, params.minWords);
  }

  private splitSmart(
    text: string,
    maxWords: number,
    overlapWords: number,
  ): string[] {
    const sentences = this.splitIntoSentences(text);
    if (!sentences.length) {
      return [text.trim()].filter(Boolean);
    }

    const result: string[] = [];
    let current: string[] = [];
    let currentWords = 0;

    for (const sentence of sentences) {
      const sentenceWords = this.countWords(sentence);

      if (currentWords + sentenceWords <= maxWords) {
        current.push(sentence);
        currentWords += sentenceWords;
        continue;
      }

      if (current.length) {
        result.push(current.join(' ').trim());
      }

      const overlap = this.takeOverlapWords(current.join(' '), overlapWords);
      current = overlap ? [overlap, sentence] : [sentence];
      currentWords = this.countWords(current.join(' '));

      if (currentWords > maxWords) {
        const hardSplit = this.hardSplitByWords(current.join(' '), maxWords, overlapWords);
        result.push(...hardSplit.slice(0, -1));
        current = [hardSplit[hardSplit.length - 1]];
        currentWords = this.countWords(current[0]);
      }
    }

    if (current.length) {
      result.push(current.join(' ').trim());
    }

    return result.filter(Boolean);
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?;:])\s+|\n+/u)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private hardSplitByWords(
    text: string,
    maxWords: number,
    overlapWords: number,
  ): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const result: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + maxWords, words.length);
      result.push(words.slice(start, end).join(' '));
      if (end >= words.length) break;
      start = Math.max(end - overlapWords, start + 1);
    }

    return result;
  }

  private takeOverlapWords(text: string, overlapWords: number): string {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length || overlapWords <= 0) return '';
    return words.slice(Math.max(0, words.length - overlapWords)).join(' ');
  }

  private mergeSmallNeighborChunks(
    chunks: ChunkOutput[],
    minWords: number,
  ): ChunkOutput[] {
    if (!chunks.length) return chunks;

    const merged: ChunkOutput[] = [];

    for (const chunk of chunks) {
      const prev = merged[merged.length - 1];
      const currentWords = chunk.tokenCount ?? this.countWords(chunk.content);

      if (
        prev &&
        prev.sectionPath === chunk.sectionPath &&
        currentWords < minWords
      ) {
        prev.content = `${prev.content}\n\n${chunk.content}`.trim();
        prev.tokenCount = this.countWords(prev.content);
        continue;
      }

      merged.push({ ...chunk });
    }

    return merged.map((chunk, index) => ({
      ...chunk,
      chunkIndex: index,
      tokenCount: this.countWords(chunk.content),
    }));
  }

  private isLowValueChunk(text: string): boolean {
    const normalized = text.trim();

    if (!normalized) return true;

    if (/^Điều\s+\d+[\s.:]*$/iu.test(normalized)) return true;
    if (/^Mục\s+[IVXLC0-9]+[\s.:]*$/iu.test(normalized)) return true;
    if (/^Chương\s+[IVXLC0-9]+[\s.:]*$/iu.test(normalized)) return true;

    return this.countWords(normalized) < 8;
  }

  private makeChunk(params: {
    chunkIndex: number;
    content: string;
    sectionPath?: string;
    pageMap?: Array<{ pageNumber: number; text: string }>;
    documentTitle?: string;
    kind: string;
  }): ChunkOutput {
    const normalizedContent = params.content.trim();
    const wordCount = this.countWords(normalizedContent);

    return {
      chunkIndex: params.chunkIndex,
      content: normalizedContent,
      pageNumber: this.inferPageNumber(normalizedContent, params.pageMap),
      sectionPath: params.sectionPath,
      tokenCount: wordCount,
      metadata: {
        kind: params.kind,
        heading: params.sectionPath ?? null,
        wordCount,
        documentTitle: params.documentTitle ?? null,
      },
    };
  }

  private inferPageNumber(
    content: string,
    pageMap?: Array<{ pageNumber: number; text: string }>,
  ): number | undefined {
    if (!pageMap?.length) return undefined;

    let bestPage: number | undefined;
    let bestScore = -1;

    for (const page of pageMap) {
      const sample = (page.text ?? '').slice(0, 120).trim();
      if (!sample) continue;

      let score = 0;
      const sampleWords = sample.split(/\s+/).filter(Boolean).slice(0, 20);

      for (const word of sampleWords) {
        if (content.includes(word)) score++;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPage = page.pageNumber;
      }
    }

    return bestPage ?? pageMap[0]?.pageNumber;
  }

  private countWords(text: string): number {
    return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }
}