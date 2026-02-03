import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AiKnowledge } from './entities/ai-knowledge.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateAiDataDto } from './dto/create-ai-data.dto';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { ApproveAiDataDto } from './dto/approve-ai-data.dto';

@Injectable()
export class AiKnowledgeService {
  constructor(
    @InjectRepository(AiKnowledge)
    private readonly aiRepo: Repository<AiKnowledge>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. Đảng viên gửi dữ liệu lên
  async createEntry(userId: string, dto: CreateAiDataDto) {
    const userProfile = await this.dataSource
      .getRepository(PartyMember)
      .findOne({
        where: { userId },
        select: ['partyCellId'],
      });
    if (!userProfile) {
      throw new NotFoundException('Hồ sơ đảng viên không tồn tại');
    }

    const newEntry = this.aiRepo.create({
      ...dto,
      userId,
      partyCellId: userProfile.partyCellId,
    });
    return await this.aiRepo.save(newEntry);
  }

  // 2. Chi ủy duyệt dữ liệu
  async approveEntry(
    requesterId: string,
    entryId: string,
    dto: ApproveAiDataDto,
  ) {
    const committeeProfile = await this.dataSource
      .getRepository(PartyMember)
      .findOne({
        where: { userId: requesterId },
      });
    if (!committeeProfile) {
      throw new NotFoundException('Hồ sơ đảng viên không tồn tại');
    }

    const entry = await this.aiRepo.findOne({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Không tìm thấy dữ liệu');

    // Chặn nếu duyệt chéo Chi bộ
    if (entry.partyCellId !== committeeProfile.partyCellId) {
      throw new ForbiddenException('Đồng chí không có quyền duyệt dữ liệu này');
    }

    entry.status = dto.status;
    entry.rejectionReason = dto.reason ?? null;
    return await this.aiRepo.save(entry);
  }
}
