import { IsString, MaxLength } from 'class-validator';

export class AskChatbotDto {
  @IsString()
  @MaxLength(2000)
  query: string;
}