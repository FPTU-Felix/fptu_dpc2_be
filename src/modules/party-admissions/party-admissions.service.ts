import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartyAdmission } from './entities/party-admission.entity';
import { AdmissionStatusEnum, UserRole } from 'src/common/enums'; // Đảm bảo import UserRole
import { CreatePartyAdmissionDto } from './dto/create-party-admission.dto';
import { UpdatePartyAdmissionDto } from './dto/update-party-admission.dto';

@Injectable()
export class PartyAdmissionsService {
  constructor(
    @InjectRepository(PartyAdmission)
    private readonly admissionRepo: Repository<PartyAdmission>,
  ) {}

  // =========================================================
  // 1. THEO DÕI TIẾN ĐỘ (Dành cho User/QCUT)
  // =========================================================
  async trackAdmissionProgress(userId: string) {
    const admission = await this.admissionRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!admission) {
      throw new NotFoundException('Bạn hiện chưa có hồ sơ kết nạp nào.');
    }

    return {
      success: true,
      message: 'Lấy tiến độ hồ sơ thành công',
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

  // =========================================================
  // 2. QUẢN LÝ TIẾN ĐỘ (Phân quyền theo Role)
  // =========================================================
  async manageProgress(
    id: string, 
    nextStatus: AdmissionStatusEnum, 
    userRole: string, // Nhận thêm role từ Controller
    remark?: string
  ) {
    const admission = await this.admissionRepo.findOne({ where: { id } });
    if (!admission) throw new NotFoundException('Hồ sơ không tồn tại');

    // --- KIỂM TRA LOGIC PHÂN QUYỀN ---

    // Bước 1: Chi ủy (COMMITTEE_MEMBER) duyệt từ SUBMITTED -> CHECKED
    if (nextStatus === AdmissionStatusEnum.CHECKED) {
      if (userRole !== UserRole.COMMITTEE_MEMBER) {
        throw new ForbiddenException('Chỉ Chi ủy mới có quyền duyệt nội dung thẩm tra (CHECKED).');
      }
      if (admission.status !== AdmissionStatusEnum.SUBMITTED) {
        throw new BadRequestException('Chỉ có thể duyệt CHECKED khi hồ sơ đang ở trạng thái SUBMITTED.');
      }
    }

    // Bước 2: Bí thư/Phó Bí thư chốt VERIFIED hoặc REJECTED
    if (nextStatus === AdmissionStatusEnum.VERIFIED || nextStatus === AdmissionStatusEnum.REJECTED) {
      if (userRole !== UserRole.SECRETARY && userRole !== UserRole.DEPUTY_SECRETARY) {
        throw new ForbiddenException('Chỉ Bí thư hoặc Phó Bí thư mới có quyền Chốt (VERIFIED) hoặc Từ chối (REJECTED).');
      }
    }

    // Cập nhật dữ liệu
    admission.status = nextStatus;
    
    // Tự động gán ghi chú nếu không có remark nhập tay
    if (!remark) {
      switch (nextStatus) {
        case AdmissionStatusEnum.CHECKED:
          admission.remark = 'Chi ủy đã duyệt nội dung hồ sơ.';
          break;
        case AdmissionStatusEnum.VERIFIED:
          admission.remark = 'Đã hoàn tất xác minh và kiểm tra dấu đỏ. Chờ họp chi bộ.';
          break;
        case AdmissionStatusEnum.REJECTED:
          admission.remark = 'Hồ sơ bị từ chối. Vui lòng kiểm tra lại.';
          break;
      }
    } else {
      admission.remark = remark;
    }

    return await this.admissionRepo.save(admission);
  }

  // =========================================================
  // 3. NỘP FILE (Submit Admission File)
  // =========================================================
  async submitDocuments(id: string, documentsUrl: string) {
    const admission = await this.admissionRepo.findOne({ where: { id } });
    if (!admission) throw new NotFoundException('Hồ sơ không tồn tại');

    admission.admissionDocumentsUrl = documentsUrl;
    admission.status = AdmissionStatusEnum.SUBMITTED;
    admission.remark = 'QCUT đã cập nhật/nộp lại hồ sơ. Chờ kiểm tra.';

    return await this.admissionRepo.save(admission);
  }

  // =========================================================
  // HELPERS & CRUD
  // =========================================================

  private getStatusDisplayName(status: AdmissionStatusEnum): string {
    const statusMap: Record<AdmissionStatusEnum, string> = {
      [AdmissionStatusEnum.SUBMITTED]: 'Đã nộp đơn kết nạp',
      [AdmissionStatusEnum.CHECKED]: 'Đã có kết quả thẩm tra (Chi ủy duyệt)',
      [AdmissionStatusEnum.VERIFIED]: 'Đã xác minh (Bí thư/PBT chốt)',
      [AdmissionStatusEnum.REJECTED]: 'Hồ sơ bị từ chối/Cần sửa lại',
    };
    return statusMap[status] || 'Đang xử lý';
  }

  async findAll() {
    return await this.admissionRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string) {
    const admission = await this.admissionRepo.findOne({ where: { id } });
    if (!admission) throw new NotFoundException('Hồ sơ không tồn tại');
    return admission;
  }

  async create(dto: CreatePartyAdmissionDto) {
    const newAdmission = this.admissionRepo.create(dto);
    return await this.admissionRepo.save(newAdmission);
  }

  async update(id: string, dto: UpdatePartyAdmissionDto) {
    const admission = await this.findOne(id);
    this.admissionRepo.merge(admission, dto);
    return await this.admissionRepo.save(admission);
  }

  async remove(id: string) {
    const admission = await this.findOne(id);
    return await this.admissionRepo.remove(admission);
  }
}