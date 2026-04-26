import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AskChatbotDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
