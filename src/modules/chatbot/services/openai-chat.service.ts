import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ToolResult } from './chatbot-tool.service';

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

  async answerWithRag(params: {
    question: string;
    chunks: RetrievedChunk[];
  }) {
    const context = this.buildChunkContext(params.chunks);

    const developerPrompt = `
Bạn là chatbot nội bộ cho hệ thống FPTU DPC2.

Quy tắc trả lời:
- Chỉ trả lời dựa trên CONTEXT được cung cấp.
- Nếu CONTEXT không đủ hoặc không liên quan trực tiếp đến câu hỏi, hãy trả lời ngắn gọn rằng không tìm thấy thông tin phù hợp trong hệ thống.
- Không được suy diễn, không bịa thêm quy trình hay quy định.
- Trả lời bằng tiếng Việt, rõ ràng, ngắn gọn.
- Nếu là câu hỏi dạng danh sách, hãy trình bày theo bullet hoặc đánh số.
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

  async answerWithTools(params: {
    question: string;
    toolResults: ToolResult[];
  }) {
    const toolContext = params.toolResults
      .map((tool, index) =>
        [
          `[TOOL ${index + 1}]`,
          `tool: ${tool.tool}`,
          `success: ${tool.success}`,
          `message: ${tool.message ?? 'N/A'}`,
          `data: ${JSON.stringify(tool.data)}`,
        ].join('\n'),
      )
      .join('\n\n');

    const developerPrompt = `
Bạn là chatbot nội bộ cho hệ thống FPTU DPC2.

Quy tắc trả lời:
- Chỉ trả lời dựa trên TOOL RESULT được cung cấp.
- Không được bịa thêm dữ liệu ngoài tool result.
- Nếu tool chưa có dữ liệu hoặc chưa triển khai, hãy nói rõ là hệ thống hiện chưa đủ dữ liệu để trả lời chính xác.
- Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng.
`;

    const userPrompt = `
Câu hỏi người dùng:
${params.question}

TOOL RESULT:
${toolContext}
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

  async answerWithHybrid(params: {
    question: string;
    chunks: RetrievedChunk[];
    toolResults: ToolResult[];
  }) {
    const ragContext = this.buildChunkContext(params.chunks);

    const toolContext = params.toolResults
      .map((tool, index) =>
        [
          `[TOOL ${index + 1}]`,
          `tool: ${tool.tool}`,
          `success: ${tool.success}`,
          `message: ${tool.message ?? 'N/A'}`,
          `data: ${JSON.stringify(tool.data)}`,
        ].join('\n'),
      )
      .join('\n\n');

    const developerPrompt = `
Bạn là chatbot nội bộ cho hệ thống FPTU DPC2.

Quy tắc trả lời:
- Ưu tiên dữ liệu TOOL RESULT khi câu hỏi liên quan dữ liệu cá nhân, meeting, đảng phí, trạng thái hồ sơ.
- Dùng RAG CONTEXT để bổ sung quy định, thủ tục, quyền, trách nhiệm.
- Không được suy diễn hoặc bịa thêm dữ liệu.
- Nếu tool không có dữ liệu nhưng tài liệu có quy định chung, hãy nói rõ đó là thông tin quy định chung chứ không phải dữ liệu cá nhân hiện tại.
- Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng.
`;

    const userPrompt = `
Câu hỏi người dùng:
${params.question}

TOOL RESULT:
${toolContext}

RAG CONTEXT:
${ragContext}
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

  private buildChunkContext(chunks: RetrievedChunk[]) {
    return chunks
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
  }
}