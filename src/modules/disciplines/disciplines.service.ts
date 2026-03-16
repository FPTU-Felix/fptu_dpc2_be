import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discipline } from './entities/discipline.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { CreateDisciplineDto } from './dto/create-discipline.dto';

@Injectable()
export class DisciplinesService {
  constructor(
    @InjectRepository(Discipline)
    private readonly disciplineRepo: Repository<Discipline>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
  ) {}

  async create(creatorId: string, dto: CreateDisciplineDto) {
    // 1. Kiểm tra Đảng viên có tồn tại không
    const member = await this.partyMemberRepo.findOne({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy hồ sơ Đảng viên này!');
    }

    // 2. Tạo bản ghi Kỷ luật & Lưu vết người tạo (creatorId)
    const newDiscipline = this.disciplineRepo.create({
      ...dto,
      createdBy: creatorId,
    });

    return await this.disciplineRepo.save(newDiscipline);
  }

  // (Gợi ý thêm) Hàm lấy danh sách kỷ luật của 1 Đảng viên để FE hiển thị Profile
  async findByMember(memberId: string) {
    return await this.disciplineRepo.find({
      where: { memberId },
      order: { date: 'DESC' }, // Án mới nhất xếp lên đầu
    });
  }
}
