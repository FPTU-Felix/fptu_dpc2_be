import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { AnnualAssessment } from './entities/annual-assessment.entity';
import { Discipline } from '../disciplines/entities/discipline.entity'; // Đường dẫn tùy project ông
import { PartyMember } from '../party-members/entities/party-member.entity';
import { AssessmentRank, AssessmentStatus } from 'src/common/enums';
import { CreateAnnualAssessmentDto } from './dto/create-annual-assessment.dto';
import { ReviewAnnualAssessmentDto } from './dto/review-annual-assessment.dto';
import { MinioService } from '../minio/minio.service';
import { UpdateAnnualAssessmentDto } from './dto/update-annual-assessment.dto';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';

@Injectable()
export class AnnualAssessmentsService {
  constructor(
    @InjectRepository(AnnualAssessment)
    private readonly assessmentRepo: Repository<AnnualAssessment>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
    @InjectRepository(Discipline)
    private readonly disciplineRepo: Repository<Discipline>,
    private readonly minioService: MinioService,
  ) {}

  async submitAssessment(
    userId: string,
    dto: CreateAnnualAssessmentDto,
    file?: Express.Multer.File,
  ) {
    const { year, selfRank, remarks } = dto;
    const member = await this.partyMemberRepo.findOne({ where: { userId } });
    if (!member) {
      throw new NotFoundException('Tài khoản này chưa có hồ sơ Đảng viên!');
    }
    const existingAssessment = await this.assessmentRepo.findOne({
      where: { memberId: member.id, year },
    });
    if (existingAssessment) {
      throw new ConflictException(
        `Bạn đã nộp bản tự đánh giá cho năm ${year} rồi!`,
      );
    }
    if (selfRank === AssessmentRank.EXCELLENT) {
      const hasDiscipline = await this.disciplineRepo.findOne({
        where: {
          memberId: member.id,
          date: Between(`${year}-01-01`, `${year}-12-31`),
        },
      });

      if (hasDiscipline) {
        throw new BadRequestException(
          `Bạn đã bị kỷ luật trong năm ${year}, không được phép tự xếp loại ${AssessmentRank.EXCELLENT}!`,
        );
      }
    }
    let uploadedUrl: string | undefined = undefined;

    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: `annual-assessments/${year}`,
      });
      uploadedUrl = uploadResult.url;
    }

    const newAssessment = this.assessmentRepo.create({
      memberId: member.id,
      year,
      selfRank,
      remarks,
      assessmentFileUrl: uploadedUrl,
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
    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Không tìm thấy bản tự đánh giá này!');
    }
    if (assessment.status !== AssessmentStatus.PENDING) {
      throw new BadRequestException(
        'Bản đánh giá này đã được xử lý từ trước, không thể sửa đổi!',
      );
    }
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

  async findAll(
    options: IPaginationOptions,
    year?: number,
    status?: AssessmentStatus,
  ): Promise<Pagination<any>> {
    const queryBuilder = this.assessmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.member', 'member')
      .leftJoinAndSelect('member.partyCell', 'cell');
    if (year) {
      queryBuilder.andWhere('a.year = :year', { year });
    }

    if (status) {
      queryBuilder.andWhere('a.status = :status', { status });
    }
    queryBuilder.orderBy('a.createdAt', 'DESC');
    const result = await paginate<AnnualAssessment>(queryBuilder, options);
    return new Pagination(
      result.items.map((assessment) => ({
        id: assessment.id,
        year: assessment.year,
        selfRank: assessment.selfRank,
        finalRank: assessment.finalRank,
        remarks: assessment.remarks,
        assessmentFileUrl: assessment.assessmentFileUrl,
        status: assessment.status,
        createdAt: assessment.createdAt,
        reviewedAt: assessment.reviewedAt,
        memberId: assessment.member?.id,
        fullName: assessment.member?.fullName,
        partyCellName:
          assessment.member?.partyCell?.name || 'Chưa phân sinh hoạt',
      })),
      result.meta,
      result.links,
    );
  }
  async updateAssessment(
    id: string,
    userId: string,
    dto: UpdateAnnualAssessmentDto,
    file?: Express.Multer.File,
  ) {
    const member = await this.partyMemberRepo.findOne({ where: { userId } });
    if (!member) {
      throw new NotFoundException('Tài khoản này chưa có hồ sơ Đảng viên!');
    }
    const assessment = await this.assessmentRepo.findOne({
      where: { id, memberId: member.id },
    });

    if (!assessment) {
      throw new NotFoundException('Không tìm thấy bản tự đánh giá của bạn!');
    }
    if (assessment.status !== AssessmentStatus.PENDING) {
      throw new BadRequestException(
        'Bản đánh giá này đã được Chi ủy xử lý, không thể chỉnh sửa!',
      );
    }
    if (dto.year && dto.year !== assessment.year) {
      const existing = await this.assessmentRepo.findOne({
        where: { memberId: member.id, year: dto.year },
      });
      if (existing) {
        throw new ConflictException(
          `Bạn đã có bản đánh giá cho năm ${dto.year} rồi!`,
        );
      }
    }

    const targetYear = dto.year || assessment.year;
    const targetRank = dto.selfRank || assessment.selfRank;
    if (targetRank === AssessmentRank.EXCELLENT) {
      const hasDiscipline = await this.disciplineRepo.findOne({
        where: {
          memberId: member.id,
          date: Like(`${targetYear}-%`),
        },
      });

      if (hasDiscipline) {
        throw new BadRequestException(
          `Bạn đã bị kỷ luật trong năm ${targetYear}, không được phép tự xếp loại ${AssessmentRank.EXCELLENT}!`,
        );
      }
    }
    let uploadedUrl = assessment.assessmentFileUrl;
    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: `annual-assessments/${targetYear}`,
      });
      uploadedUrl = uploadResult.url;
    }
    Object.assign(assessment, {
      year: dto.year,
      selfRank: dto.selfRank,
      remarks: dto.remarks,
      assessmentFileUrl: uploadedUrl,
    });

    return await this.assessmentRepo.save(assessment);
  }
}
