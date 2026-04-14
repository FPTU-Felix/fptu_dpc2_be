import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartyFee } from './entities/party-fee.entity';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { GetPartyFeesDto } from './dto/party-fee.dto';
import { NotificationType, FeeStatusEnum } from 'src/common/enums';

@Injectable()
export class PartyFeesService {
  constructor(
    @InjectRepository(PartyFee)
    private feeRepo: Repository<PartyFee>,
    private notificationsService: NotificationsService,
  ) {}

  async getFeesByChiBo(dto: GetPartyFeesDto, options: IPaginationOptions) {
    const { partyCellId, month, year } = dto;
    try {
      const queryBuilder = this.feeRepo
        .createQueryBuilder('fee')
        .innerJoinAndSelect('fee.member', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .where('member.partyCellId = :partyCellId', { partyCellId })
        .andWhere('fee.month = :month', { month })
        .andWhere('fee.year = :year', { year })
        .orderBy('fee.status', 'DESC')
        .addOrderBy('member.createdAt', 'ASC');

      return await paginate<PartyFee>(queryBuilder, options);
    } catch (error) {
      console.error('Error building query for party fees:', error);
      throw new BadRequestException('Có lỗi xảy ra khi truy vấn Đảng phí');
    }
  }

  async confirmPayment(feeId: string, recordedById: string) {
    const fee = await this.feeRepo.findOne({
      where: { id: feeId },
      relations: ['member', 'member.user'],
    });
    if (!fee)
      throw new NotFoundException('Không tìm thấy bản ghi Đảng phí này');
    if (fee.status === FeeStatusEnum.PAID) {
      throw new BadRequestException(
        'Đảng phí tháng này đã được thanh toán rồi!',
      );
    }

    // Cập nhật trạng thái
    fee.status = FeeStatusEnum.PAID;
    fee.paymentDate = new Date();
    fee.recordedById = recordedById;

    const savedFee = await this.feeRepo.save(fee);
    if (fee.member?.user) {
      this.notificationsService.createInternal(
        fee.member.user.id,
        `Xác nhận đóng Đảng phí ${fee.month}/${fee.year}`,
        `Chi ủy đã xác nhận nhận đủ Đảng phí tháng <b>${fee.month}/${fee.year}</b> của đồng chí vào lúc ${savedFee.paymentDate.toLocaleString('vi-VN')}.<br/>Cảm ơn đồng chí đã hoàn thành nghĩa vụ.`,
        NotificationType.PARTY_FEE,
        fee.member.user.email,
      );
    }
    return {
      success: true,
      message: 'Xác nhận thu Đảng phí thành công',
      data: savedFee,
    };
  }
}
