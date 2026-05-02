import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import * as cheerio from 'cheerio';

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  async extractText(file: Express.Multer.File): Promise<{
    text: string;
    pageMap?: Array<{ pageNumber: number; text: string }>;
  }> {
    const mimetype = file.mimetype;
    const originalName = file.originalname?.toLowerCase() ?? '';

    this.logger.log(
      `extractText called. originalName=${originalName}, mimetype=${mimetype}, size=${file.size}`,
    );

    // TXT
    if (mimetype === 'text/plain' || originalName.endsWith('.txt')) {
      const text = this.sanitizeText(file.buffer.toString('utf-8'));
      return { text, pageMap: [] };
    }

    // HTML
    if (
      mimetype === 'text/html' ||
      originalName.endsWith('.html') ||
      originalName.endsWith('.htm')
    ) {
      const html = file.buffer.toString('utf-8');
      const text = this.extractTextFromHtml(html);
      return { text, pageMap: [] };
    }

    // DOCX
    if (
      mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      originalName.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({
        buffer: file.buffer,
      });

      const text = this.sanitizeText(result.value || '');

      if (result.messages?.length) {
        this.logger.debug(
          `DOCX parser messages: ${JSON.stringify(result.messages)}`,
        );
      }

      return { text, pageMap: [] };
    }

    // PDF
    if (mimetype === 'application/pdf' || originalName.endsWith('.pdf')) {
      const parser = new PDFParse({ data: file.buffer });

      try {
        const parsed = await parser.getText();
        const text = this.sanitizeText(parsed.text || '');

        return {
          text,
          pageMap: [],
        };
      } finally {
        await parser.destroy();
      }
    }

    // DOC (legacy)
    if (mimetype === 'application/msword' || originalName.endsWith('.doc')) {
      throw new BadRequestException(
        'Legacy .doc is not supported directly yet. Please convert to .docx.',
      );
    }

    throw new BadRequestException(
      `Unsupported parser for file type: ${mimetype || originalName}`,
    );
  }

  private extractTextFromHtml(html: string): string {
    const $ = cheerio.load(html);

    $('script, style, noscript').remove();
    $('br').replaceWith('\n');

    $('p, div, li, h1, h2, h3, h4, h5, h6, tr').each((_, el) => {
      $(el).append('\n');
    });

    const text = $('body').length ? $('body').text() : $.text();

    return this.sanitizeText(text);
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/\u0000/g, '')
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
      .replace(/\r/g, '\n')
      .replace(/\u00A0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
}
