import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

type RetrievedChunk = {
  id: string;
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  documentCategory: string;
  versionLabel: string;
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  sectionPath: string | null;
  tokenCount: number;
  metadata: Record<string, any>;
  distance: number;
  score: number;
};

@Injectable()
export class OpenAiChatService {
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async answerQuestion(params: { question: string; chunks: RetrievedChunk[] }) {
    const context = params.chunks
      .map((chunk, index) => {
        return [
          `[SOURCE ${index + 1}]`,
          `documentTitle: ${chunk.documentTitle}`,
          `documentId: ${chunk.documentId}`,
          `documentVersionId: ${chunk.documentVersionId}`,
          `chunkIndex: ${chunk.chunkIndex}`,
          `pageNumber: ${chunk.pageNumber ?? 'N/A'}`,
          `sectionPath: ${chunk.sectionPath ?? 'N/A'}`,
          `score: ${chunk.score}`,
          `content: ${chunk.content}`,
        ].join('\n');
      })
      .join('\n\n');

    const developerPrompt = `
Bạn là chatbot nội bộ cho hệ thống FPTU DPC2.

Quy tắc trả lời:
- Chỉ trả lời dựa trên CONTEXT được cung cấp.
- Nếu CONTEXT không đủ hoặc không liên quan trực tiếp đến câu hỏi, hãy trả lời ngắn gọn rằng không tìm thấy thông tin phù hợp trong hệ thống.
- Không được tóm tắt các tài liệu không liên quan chỉ để lấp chỗ trống.
- Không suy diễn, không bịa thêm quy trình hay quy định.
- Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng.
- Chỉ thêm "Nguồn tham chiếu" khi thực sự có nguồn liên quan trực tiếp.
`;

    const userPrompt = `
Câu hỏi người dùng:
${params.question}

CONTEXT:
${context}
`;

    const response = await this.client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      input: [
        {
          role: 'developer',
          content: [{ type: 'input_text', text: developerPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userPrompt }],
        },
      ],
    });

    return {
      answer: response.output_text,
    };
  }
}
