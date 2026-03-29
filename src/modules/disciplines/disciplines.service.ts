import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discipline } from './entities/discipline.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { MinioService } from '../minio/minio.service';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';

@Injectable()
export class DisciplinesService {
  constructor(
    @InjectRepository(Discipline)
    private readonly disciplineRepo: Repository<Discipline>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
    private readonly minioService: MinioService,
  ) {}

  async create(
    creatorId: string,
    dto: CreateDisciplineDto,
    file?: Express.Multer.File,
  ) {
    const member = await this.partyMemberRepo.findOne({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy hồ sơ Đảng viên này!');
    }
    let uploadedUrl: string | undefined = undefined;
    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file,
        folder: `disciplines/${new Date().getFullYear()}`,
      });
      uploadedUrl = uploadResult.url;
    }
    const newDiscipline = this.disciplineRepo.create({
      ...dto,
      decisionFileUrl: uploadedUrl,
      createdBy: creatorId,
    });

    return await this.disciplineRepo.save(newDiscipline);
  }

  async update(
    id: string,
    dto: UpdateDisciplineDto,
    file?: Express.Multer.File,
  ) {
    const discipline = await this.disciplineRepo.findOne({ where: { id } });
    if (!discipline) {
      throw new NotFoundException('Không tìm thấy bản ghi kỷ luật này!');
    }

    let uploadedUrl = discipline.decisionFileUrl;
    if (file) {
      const uploadResult = await this.minioService.uploadFile({
        file,
        folder: `disciplines/${new Date().getFullYear()}`,
      });
      uploadedUrl = uploadResult.url;
    }

    Object.assign(discipline, {
      ...dto,
      decisionFileUrl: uploadedUrl,
    });

    return await this.disciplineRepo.save(discipline);
  }

  async findByMember(memberId: string) {
    return await this.disciplineRepo.find({
      where: { memberId },
      order: { date: 'DESC' },
    });
  }

  async findAll(
    options: IPaginationOptions,
    year?: number,
    memberId?: string,
  ): Promise<Pagination<Discipline>> {
    const queryBuilder = this.disciplineRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.member', 'member')
      .leftJoinAndSelect('member.partyCell', 'cell');

    if (year) {
      queryBuilder.andWhere('YEAR(d.date) = :year', { year });
    }

    if (memberId) {
      queryBuilder.andWhere('d.memberId = :memberId', { memberId });
    }

    queryBuilder.orderBy('d.date', 'DESC');

    return paginate<Discipline>(queryBuilder, options);
  }
}
