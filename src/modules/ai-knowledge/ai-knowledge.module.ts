import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiKnowledgeController } from './ai-knowledge.controller';
import { AiKnowledge } from './entities/ai-knowledge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiKnowledge])],
  controllers: [AiKnowledgeController],
  providers: [AiKnowledgeService],
  exports: [AiKnowledgeService],
})
export class AiKnowledgeModule {}
