import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { AnnualAssessment } from './entities/annual-assessment.entity';
import { Discipline } from '../disciplines/entities/discipline.entity'; // Đường dẫn tùy project ông
import { PartyMember } from '../party-members/entities/party-member.entity';
import {
  AssessmentRank,
  AssessmentStatus,
  MemberStatusEnum,
  NotificationType,
  UserRole,
} from 'src/common/enums';
import { CreateAnnualAssessmentDto } from './dto/create-annual-assessment.dto';
import { ReviewAnnualAssessmentDto } from './dto/review-annual-assessment.dto';
import { MinioService } from '../minio/minio.service';
import { UpdateAnnualAssessmentDto } from './dto/update-annual-assessment.dto';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { EvaluationConfig } from './entities/evaluation-config.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { getObjectDiff } from 'src/common/utils/diff.util';
import { EventEmitter2 } from 'eventemitter2';
import { AuditLogEvent } from '../system/events/audit-log.event';

@Injectable()
export class AnnualAssessmentsService {
  private readonly logger = new Logger(AnnualAssessmentsService.name);
  constructor(
    @InjectRepository(AnnualAssessment)
    private readonly assessmentRepo: Repository<AnnualAssessment>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
    @InjectRepository(Discipline)
    private readonly disciplineRepo: Repository<Discipline>,
    private readonly minioService: MinioService,
    @InjectRepository(EvaluationConfig)
    private readonly configRepo: Repository<EvaluationConfig>,
    private readonly notiService: NotificationsService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async upsertEvaluationConfig(
    partyCellId: string,
    actorId: string,
    ip: string,
    year: number,
    criteriaTemplate: string[],
  ) {
    const exitingPartyCell = await this.partyMemberRepo
      .createQueryBuilder('member')
      .leftJoin('member.partyCell', 'cell')
      .where('cell.id = :partyCellId', { partyCellId })
      .getOne();
    if (!exitingPartyCell) {
      throw new NotFoundException('Chi bộ không tồn tại!');
    }
    let config = await this.configRepo.findOne({
      where: { partyCellId, year },
    });

    const oldData = config ? { ...config } : null;
    if (config) {
      config.criteriaTemplate = criteriaTemplate;
    } else {
      config = this.configRepo.create({
        partyCellId,
        year,
        criteriaTemplate,
      });
    }
    const changes = getObjectDiff(oldData, config);
    if (changes) {
      this.eventEmitter.emit(
        'audit.log',
        new AuditLogEvent(
          actorId,
          'UPDATE_EVALUATION_CONFIG' + year,
          'evaluation_configs',
          config.id,
          changes,
          ip,
        ),
      );
    }
    return await this.configRepo.save(config);
  }
  async getEvaluationConfig(partyCellId: string, year: number) {
    const config = await this.configRepo.findOne({
      where: { partyCellId, year },
    });
    if (!config) {
      throw new NotFoundException(
        `Chi bộ chưa cấu hình bộ tiêu chí đánh giá cho năm ${year}`,
      );
    }
    return config;
  }

  async submitAssessment(
    userId: string,
    dto: CreateAnnualAssessmentDto,
    file?: Express.Multer.File,
  ) {
    const { year, selfRank, remarks } = dto;
    const member = await this.partyMemberRepo.findOne({ where: { userId } });

    if (!member)
      throw new NotFoundException('Tài khoản này chưa có hồ sơ Đảng viên!');

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
          `Bạn đã bị kỷ luật trong năm ${year}, không được tự xếp loại ${AssessmentRank.EXCELLENT}!`,
        );
      }
    }

    let uploadedUrl: string | undefined = undefined;
    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: `annual-assessments/${year}`,
      });
      uploadedUrl = uploadResult.objectName;
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

  private async notifyCommittee(member: PartyMember, year: number) {
    try {
      const committeeMembers = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('party_members', 'pm', 'pm.user_id = u.id')
        .where('pm.party_cell_id = :cellId', { cellId: member.partyCellId })
        .andWhere('u.role_id IN (:...roleIds)', {
          roleIds: [
            'ea9be120-91f4-4430-a0ec-667e54bd1d7a',
            'eee09c6c-460c-43ac-bbd8-c741d6c76aac',
            'e6bafbfc-a3a9-4f7f-90da-903850d059e9',
          ],
        })
        .getMany();

      if (!committeeMembers.length) return;
      for (const admin of committeeMembers) {
        if (admin.id === member.userId) continue;

        this.notiService.createInternal(
          admin.id,
          `Có bản tự đánh giá mới - Năm ${year}`,
          `Đồng chí <b>${member.fullName}</b> vừa nộp bản tự đánh giá năm ${year}.<br>Mời đồng chí vào kiểm tra.`,
          NotificationType.SUBMISSION,
          admin.email,
        );
      }
    } catch (error) {
      this.logger.error(`Lỗi khi thông báo Chi ủy: ${error.message}`);
    }
  }

  async reviewAssessment(
    assessmentId: string,
    reviewerId: string,
    ip: string,
    dto: ReviewAnnualAssessmentDto,
  ) {
    const { status, finalRank, score, criteriaChecklist } = dto;

    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
    });

    if (!assessment)
      throw new NotFoundException('Không tìm thấy bản tự đánh giá này!');

    if (assessment.status !== AssessmentStatus.PENDING) {
      throw new BadRequestException(
        'Bản đánh giá này đã được xử lý từ trước, không thể sửa đổi!',
      );
    }

    if (finalRank === AssessmentRank.EXCELLENT) {
      const hasDiscipline = await this.disciplineRepo.findOne({
        where: {
          memberId: assessment.memberId,
          date: Between(`${assessment.year}-01-01`, `${assessment.year}-12-31`),
        },
      });

      if (hasDiscipline) {
        throw new BadRequestException(
          `Đảng viên này đã bị kỷ luật trong năm ${assessment.year}. Hệ thống từ chối mức xếp loại ${AssessmentRank.EXCELLENT}!`,
        );
      }
    }
    const oldData = { ...assessment };

    assessment.status = status;
    assessment.finalRank = finalRank;
    assessment.score = score;
    assessment.criteriaChecklist = criteriaChecklist;
    assessment.reviewerId = reviewerId;
    assessment.reviewedAt = new Date();

    const member = await this.partyMemberRepo.findOne({
      where: { id: assessment.memberId },
      relations: ['user'],
    });
    if (member && member.user) {
      this.notiService.createInternal(
        member.user.id,
        `Kết quả đánh giá Đảng viên năm ${assessment.year}`,
        `Kính gửi đồng chí <b>${member.fullName}</b>,<br><br>Chi ủy đã hoàn tất việc chấm điểm thi đua năm ${assessment.year} của đồng chí.<br>
        - Điểm số: <b style="color: #da251d">${assessment.score}/100</b><br>
        - Xếp loại: <b>${assessment.finalRank}</b><br><br>`,
        NotificationType.SUBMISSION,
        member.user.email,
      );
    }
    const result = await this.assessmentRepo.save(assessment);
    this.eventEmitter.emit('UPDATE_ANNUAL_ASSESSMENT', {
      id: assessment.id,
      ip,
      changes: getObjectDiff(oldData, assessment),
    });
    return result;
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

    if (year) queryBuilder.andWhere('a.year = :year', { year });
    if (status) queryBuilder.andWhere('a.status = :status', { status });
    queryBuilder.addOrderBy('a.score', 'DESC', 'NULLS LAST');
    queryBuilder.orderBy('a.createdAt', 'DESC');

    const result = await paginate<AnnualAssessment>(queryBuilder, options);

    return new Pagination(
      result.items.map((assessment) => ({
        id: assessment.id,
        year: assessment.year,
        selfRank: assessment.selfRank,
        finalRank: assessment.finalRank,
        score: assessment.score,
        criteriaChecklist: assessment.criteriaChecklist,
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

  async updateMyAssessment(
    userId: string,
    year: number,
    dto: UpdateAnnualAssessmentDto,
    file?: Express.Multer.File,
  ) {
    const member = await this.partyMemberRepo.findOne({ where: { userId } });
    if (!member) {
      throw new NotFoundException('Tài khoản này chưa có hồ sơ Đảng viên!');
    }
    const assessment = await this.assessmentRepo.findOne({
      where: { memberId: member.id, year },
    });

    if (!assessment) {
      throw new NotFoundException(
        `Không tìm thấy bản tự đánh giá năm ${year} của bạn!`,
      );
    }

    if (assessment.status !== AssessmentStatus.PENDING) {
      throw new BadRequestException(
        'Bản đánh giá này đã được Chi ủy xử lý, không thể chỉnh sửa!',
      );
    }

    const targetRank = dto.selfRank || assessment.selfRank;

    if (targetRank === AssessmentRank.EXCELLENT) {
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

    let uploadedUrl = assessment.assessmentFileUrl;
    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: `annual-assessments/${year}`,
      });
      uploadedUrl = uploadResult.objectName;
    }
    Object.assign(assessment, {
      selfRank: dto.selfRank,
      remarks: dto.remarks,
      assessmentFileUrl: uploadedUrl,
    });

    return await this.assessmentRepo.save(assessment);
  }

  async getMyAssessmentByYear(userId: string, year: number) {
    const member = await this.partyMemberRepo.findOne({ where: { userId } });
    if (!member) {
      throw new NotFoundException('Tài khoản này chưa có hồ sơ Đảng viên!');
    }

    const assessment = await this.assessmentRepo.findOne({
      where: { memberId: member.id, year },
    });

    if (!assessment) {
      throw new NotFoundException(
        `Bạn chưa có bản đánh giá nào trong năm ${year}!`,
      );
    }

    return assessment;
  }

  async getAssessmentStatistics(partyCellId: string, year: number) {
    const totalMembers = await this.partyMemberRepo.count({
      where: {
        partyCellId: partyCellId,
        status: In([MemberStatusEnum.RESERVE, MemberStatusEnum.OFFICIAL]),
      },
    });

    if (totalMembers === 0) {
      return { total: 0, stats: [], unclassified: 0 };
    }
    const rankCounts = await this.partyMemberRepo
      .createQueryBuilder('member')
      .leftJoin(
        'annual_assessments',
        'assessment',
        'assessment.member_id = member.id AND assessment.year = :year',
        { year },
      )
      .select('assessment.final_rank', 'rank')
      .addSelect('COUNT(member.id)', 'count')
      .where('member.party_cell_id = :partyCellId', { partyCellId })
      .andWhere('member.status IN (:...statuses)', {
        statuses: [MemberStatusEnum.RESERVE, MemberStatusEnum.OFFICIAL],
      })
      .andWhere('assessment.final_rank IS NOT NULL')
      .groupBy('assessment.final_rank')
      .getRawMany();

    let totalClassified = 0;
    const statsMap: Record<string, { count: number; percentage: number }> = {
      [AssessmentRank.EXCELLENT]: { count: 0, percentage: 0 },
      [AssessmentRank.GOOD]: { count: 0, percentage: 0 },
      [AssessmentRank.AVERAGE]: { count: 0, percentage: 0 },
      [AssessmentRank.POOR]: { count: 0, percentage: 0 },
    };

    rankCounts.forEach((row) => {
      const rank = row.rank as AssessmentRank;
      const count = parseInt(row.count, 10);

      if (statsMap[rank]) {
        statsMap[rank].count = count;
        totalClassified += count;
      }
    });

    // Tính phần trăm (dựa trên tống số người ĐÃ CÓ KẾT QUẢ xếp loại)
    if (totalClassified > 0) {
      Object.keys(statsMap).forEach((key) => {
        const percentage = (statsMap[key].count / totalClassified) * 100;
        statsMap[key].percentage = Math.round(percentage * 10) / 10;
      });
    }

    return {
      totalMembers,
      totalClassified,
      unclassified: totalMembers - totalClassified,
      statistics: [
        {
          label: 'Hoàn thành xuất sắc',
          rank: AssessmentRank.EXCELLENT,
          count: statsMap[AssessmentRank.EXCELLENT].count,
          percentage: statsMap[AssessmentRank.EXCELLENT].percentage,
        },
        {
          label: 'Hoàn thành tốt',
          rank: AssessmentRank.GOOD,
          count: statsMap[AssessmentRank.GOOD].count,
          percentage: statsMap[AssessmentRank.GOOD].percentage,
        },
        {
          label: 'Hoàn thành',
          rank: AssessmentRank.AVERAGE,
          count: statsMap[AssessmentRank.AVERAGE].count,
          percentage: statsMap[AssessmentRank.AVERAGE].percentage,
        },
        {
          label: 'Không hoàn thành',
          rank: AssessmentRank.POOR,
          count: statsMap[AssessmentRank.POOR].count,
          percentage: statsMap[AssessmentRank.POOR].percentage,
        },
      ],
    };
  }
}
