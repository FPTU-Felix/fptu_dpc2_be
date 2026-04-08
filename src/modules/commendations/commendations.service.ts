import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCommendationDto } from './dto/create-commendation.dto';
import { Commendation } from './entities/commendation.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import { UpdateCommendationDto } from './dto/update-commendation.dto';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { AuditLogEvent } from '../system/events/audit-log.event';
import { getObjectDiff } from 'src/common/utils/diff.util';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CommendationsService {
  constructor(
    @InjectRepository(Commendation)
    private readonly commendationRepo: Repository<Commendation>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
    private readonly minioService: MinioService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    creatorId: string,
    dto: CreateCommendationDto,
    file?: Express.Multer.File,
  ) {
    const member = await this.partyMemberRepo.findOne({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy hồ sơ Đảng viên này!');
    }

    // Xử lý upload MinIO
    let uploadedUrl: string | undefined = undefined;
    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: `commendations/${new Date().getFullYear()}`,
      });
      uploadedUrl = uploadResult.objectName;
    }

    const newCommendation = this.commendationRepo.create({
      ...dto,
      decisionFileUrl: uploadedUrl,
      createdBy: creatorId,
    });

    return await this.commendationRepo.save(newCommendation);
  }
  async update(
    id: string,
    actorId: string,
    ip: string,
    dto: UpdateCommendationDto,
    file?: Express.Multer.File,
  ) {
    const commendation = await this.commendationRepo.findOne({
      where: { id },
    });

    if (!commendation) {
      throw new NotFoundException('Không tìm thấy quyết định khen thưởng này!');
    }

    const oldData = { ...commendation };

    let uploadedUrl = commendation.decisionFileUrl;
    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: `commendations/${new Date().getFullYear()}`,
      });
      uploadedUrl = uploadResult.objectName;
    }
    Object.assign(commendation, {
      ...dto,
      decisionFileUrl: uploadedUrl,
    });

    const result = await this.commendationRepo.save(commendation);

    const changes = getObjectDiff(oldData, result);

    if (changes) {
      this.eventEmitter.emit(
        'audit.log',
        new AuditLogEvent(
          actorId,
          'UPDATE_COMMENDATION',
          'commendations',
          id,
          changes,
          ip,
        ),
      );
    }

    return result;
  }
  async findByMember(memberId: string) {
    return await this.commendationRepo.find({
      where: { memberId },
      order: { date: 'DESC' },
    });
  }

  async findAll(
    options: IPaginationOptions,
    year?: number,
    memberId?: string,
  ): Promise<Pagination<Commendation>> {
    const queryBuilder = this.commendationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.member', 'member')
      .leftJoinAndSelect('member.partyCell', 'cell');

    if (year) {
      queryBuilder.andWhere('YEAR(c.date) = :year', { year });
    }

    if (memberId) {
      queryBuilder.andWhere('c.memberId = :memberId', { memberId });
    }

    queryBuilder.orderBy('c.date', 'DESC');

    return paginate<Commendation>(queryBuilder, options);
  }

  async findMyCommendations(userId: string) {
    const member = await this.partyMemberRepo.findOne({
      where: { userId: userId },
    });
    if (!member) {
      throw new NotFoundException(
        'Không tìm thấy thông tin hồ sơ Đảng viên của bạn',
      );
    }
    return await this.findByMember(member.id);
  }
}
