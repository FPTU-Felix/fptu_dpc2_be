import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AnnualAssessment } from './entities/annual-assessment.entity';
import { Discipline } from '../disciplines/entities/discipline.entity'; // Đường dẫn tùy project ông
import { PartyMember } from '../party-members/entities/party-member.entity';
import { AssessmentRank, AssessmentStatus } from 'src/common/enums';
import { CreateAnnualAssessmentDto } from './dto/create-annual-assessment.dto';
import { ReviewAnnualAssessmentDto } from './dto/review-annual-assessment.dto';

@Injectable()
export class AnnualAssessmentsService {
  constructor(
    @InjectRepository(AnnualAssessment)
    private readonly assessmentRepo: Repository<AnnualAssessment>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
    @InjectRepository(Discipline)
    private readonly disciplineRepo: Repository<Discipline>,
  ) {}

  async submitAssessment(userId: string, dto: CreateAnnualAssessmentDto) {
    const { year, selfRank, remarks, assessmentFileUrl } = dto;

    // Tìm hồ sơ Đảng viên của user đang login
    const member = await this.partyMemberRepo.findOne({ where: { userId } });
    if (!member) {
      throw new NotFoundException('Tài khoản này chưa có hồ sơ Đảng viên!');
    }

    //Chống nộp đúp (1 năm chỉ có 1 đơn)
    const existingAssessment = await this.assessmentRepo.findOne({
      where: { memberId: member.id, year },
    });
    if (existingAssessment) {
      throw new ConflictException(
        `Bạn đã nộp bản tự đánh giá cho năm ${year} rồi!`,
      );
    }

    // Chống chọn "Xuất sắc" nếu dính kỷ luật
    if (selfRank === AssessmentRank.EXCELLENT) {
      // Tìm xem trong năm đó có án kỷ luật nào không (check theo chuỗi năm '%2026%')
      const hasDiscipline = await this.disciplineRepo.findOne({
        where: {
          memberId: member.id,
          date: Like(`${year}-%`),
        },
      });

      if (hasDiscipline) {
        throw new BadRequestException(
          `Bạn đã bị kỷ luật trong năm ${year}, không được phép tự xếp loại ${AssessmentRank.EXCELLENT}!`,
        );
      }
    }

    // Lưu vào DB với trạng thái PENDING
    const newAssessment = this.assessmentRepo.create({
      memberId: member.id,
      year,
      selfRank,
      remarks,
      assessmentFileUrl,
      status: AssessmentStatus.PENDING,
    });

    return await this.assessmentRepo.save(newAssessment);
  }

  async reviewAssessment(
    assessmentId: string,
    reviewerId: string,
    dto: ReviewAnnualAssessmentDto,
  ) {
    const { status, finalRank } = dto;

    // Tìm bản đánh giá
    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Không tìm thấy bản tự đánh giá này!');
    }

    //Chỉ duyệt đơn đang chờ (PENDING)
    if (assessment.status !== AssessmentStatus.PENDING) {
      throw new BadRequestException(
        'Bản đánh giá này đã được xử lý từ trước, không thể sửa đổi!',
      );
    }

    //Chi ủy cũng không được thiên vị!
    if (finalRank === AssessmentRank.EXCELLENT) {
      const hasDiscipline = await this.disciplineRepo.findOne({
        where: {
          memberId: assessment.memberId,
          date: Like(`${assessment.year}-%`),
        },
      });

      if (hasDiscipline) {
        throw new BadRequestException(
          `Đảng viên này đã bị kỷ luật trong năm ${assessment.year}. Hệ thống từ chối mức xếp loại ${AssessmentRank.EXCELLENT}!`,
        );
      }
    }

    assessment.status = status;
    assessment.finalRank = finalRank;
    assessment.reviewerId = reviewerId;
    assessment.reviewedAt = new Date();

    return await this.assessmentRepo.save(assessment);
  }
}
