import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCommendationDto } from './dto/create-commendation.dto';
import { Commendation } from './entities/commendation.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CommendationsService {
  constructor(
    @InjectRepository(Commendation)
    private readonly commendationRepo: Repository<Commendation>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
  ) {}

  async create(creatorId: string, dto: CreateCommendationDto) {
    // Check xem Đảng viên có tồn tại không
    const member = await this.partyMemberRepo.findOne({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy hồ sơ Đảng viên này!');
    }

    // Tạo bản ghi Khen thưởng & Lưu vết người tạo
    const newCommendation = this.commendationRepo.create({
      ...dto,
      createdBy: creatorId,
    });

    return await this.commendationRepo.save(newCommendation);
  }

  // Lấy lịch sử khen thưởng của 1 người
  async findByMember(memberId: string) {
    return await this.commendationRepo.find({
      where: { memberId },
      order: { date: 'DESC' }, // Thành tích mới nhất xếp lên đầu
    });
  }
}
