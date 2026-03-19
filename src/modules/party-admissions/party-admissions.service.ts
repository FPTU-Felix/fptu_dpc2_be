import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartyAdmission } from './entities/party-admission.entity';
import { AdmissionStatusEnum, UserRole } from 'src/common/enums';

@Injectable()
export class PartyAdmissionsService {
  constructor(
    @InjectRepository(PartyAdmission)
    private readonly admissionRepo: Repository<PartyAdmission>,
  ) {}

  async trackAdmissionProgress(userId: string) {
    const admission = await this.admissionRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!admission) throw new NotFoundException('Bạn hiện chưa có hồ sơ kết nạp nào.');

    return {
      success: true,
      data: {
        id: admission.id,
        status: admission.status,
        statusDisplay: this.getStatusDisplayName(admission.status),
        documentsUrl: admission.admissionDocumentsUrl,
        remark: admission.remark || 'Hồ sơ đang được xử lý đúng quy trình.',
        updatedAt: admission.updatedAt,
      },
    };
  }

  async manageProgress(id: string, nextStatus: AdmissionStatusEnum, userRole: string, remark?: string) {
    const admission = await this.findOne(id);

    if (nextStatus === AdmissionStatusEnum.CHECKED) {
      if (userRole !== UserRole.COMMITTEE_MEMBER) 
        throw new ForbiddenException('Chỉ Chi ủy mới có quyền duyệt nội dung thẩm tra.');
      if (admission.status !== AdmissionStatusEnum.SUBMITTED)
        throw new BadRequestException('Chỉ có thể duyệt CHECKED khi hồ sơ đang ở trạng thái SUBMITTED.');
    }

    if (nextStatus === AdmissionStatusEnum.VERIFIED || nextStatus === AdmissionStatusEnum.REJECTED) {
      if (userRole !== UserRole.SECRETARY && userRole !== UserRole.DEPUTY_SECRETARY)
        throw new ForbiddenException('Chỉ Bí thư hoặc Phó Bí thư mới có quyền Chốt hoặc Từ chối.');
    }

    admission.status = nextStatus;
    if (!remark) {
      const defaultRemarks = {
        [AdmissionStatusEnum.CHECKED]: 'Chi ủy đã duyệt nội dung hồ sơ.',
        [AdmissionStatusEnum.VERIFIED]: 'Đã hoàn tất xác minh. Chờ họp chi bộ.',
        [AdmissionStatusEnum.REJECTED]: 'Hồ sơ bị từ chối. Vui lòng kiểm tra lại.',
      };
      admission.remark = defaultRemarks[nextStatus] || admission.remark;
    } else {
      admission.remark = remark;
    }

    return await this.admissionRepo.save(admission);
  }

  async submitDocuments(id: string, documentsUrl: string) {
    const admission = await this.findOne(id);
    admission.admissionDocumentsUrl = documentsUrl;
    admission.status = AdmissionStatusEnum.SUBMITTED;
    admission.remark = 'QCUT đã cập nhật/nộp lại hồ sơ. Chờ kiểm tra.';
    return await this.admissionRepo.save(admission);
  }

  async findAll() {
    return await this.admissionRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string) {
    const admission = await this.admissionRepo.findOne({ where: { id } });
    if (!admission) throw new NotFoundException('Hồ sơ không tồn tại');
    return admission;
  }

  private getStatusDisplayName(status: AdmissionStatusEnum): string {
    const statusMap = {
      [AdmissionStatusEnum.SUBMITTED]: 'Đã nộp đơn kết nạp',
      [AdmissionStatusEnum.CHECKED]: 'Đã có kết quả thẩm tra (Chi ủy duyệt)',
      [AdmissionStatusEnum.VERIFIED]: 'Đã xác minh (Bí thư/PBT chốt)',
      [AdmissionStatusEnum.REJECTED]: 'Hồ sơ bị từ chối/Cần sửa lại',
    };
    return statusMap[status] || 'Đang xử lý';
  }
}