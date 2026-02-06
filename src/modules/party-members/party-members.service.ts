import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

// Entities
import { PartyMember } from './entities/party-member.entity';
import { PartyMemberPosition } from './entities/party-member-position.entity'; // Kiểm tra lại đường dẫn import này
import { PartyPosition as PartyPositionEntity } from '../party-positions/entities/party-position.entity';
import { User } from '../users/entities/user.entity';

// DTOs & Enums
import { AssignPositionDto } from './dto/assign-position.dto';
// Đảm bảo import đúng file Enum chung của dự án
import { PartyPosition, UserRole } from '../../common/enums';

@Injectable()
export class PartyMembersService {
  constructor(
    @InjectRepository(PartyMember)
    private readonly memberRepo: Repository<PartyMember>,
    @InjectRepository(PartyMemberPosition)
    private readonly memberPositionRepo: Repository<PartyMemberPosition>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // HÀM BỔ NHIỆM CHỨC VỤ (CORE LOGIC)
  // ==========================================
  async assignPosition(
    adminId: string,
    memberId: string,
    dto: AssignPositionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Validate: Tìm chức vụ
      const positionMeta = await manager.findOne(PartyPositionEntity, {
        where: { code: dto.positionCode },
      });

      if (!positionMeta) {
        throw new BadRequestException(
          `Mã chức vụ "${dto.positionCode}" chưa được định nghĩa.`,
        );
      }

      // 2. Validate: Tìm Đảng viên
      const member = await manager.findOne(PartyMember, {
        where: { id: memberId },
        relations: ['user'],
      });
      if (!member)
        throw new NotFoundException('Không tìm thấy hồ sơ Đảng viên');

      // 3. Xử lý chức vụ CŨ
      const currentPosition = await manager.findOne(PartyMemberPosition, {
        where: { memberId: member.id, isCurrent: true },
      });

      const actionDate = dto.appointedDate
        ? new Date(dto.appointedDate)
        : new Date();

      if (currentPosition) {
        if (currentPosition.positionId === positionMeta.id) {
          return { message: 'Đảng viên đang giữ chức vụ này rồi.' };
        }
        currentPosition.isCurrent = false;
        currentPosition.dismissedDate = actionDate;
        await manager.save(currentPosition);
      }

      // 4. Tạo chức vụ MỚI
      const newAssignment = manager.create(PartyMemberPosition, {
        memberId: member.id,
        partyCellId: member.partyCellId,
        positionId: positionMeta.id,
        appointedDate: actionDate,
        isCurrent: true,
        note: dto.note || 'Bổ nhiệm qua hệ thống',
      });

      await manager.save(newAssignment);

      // 5. Đồng bộ quyền User (System Role)
      // FIX LỖI SCOPE: Khai báo biến này bên ngoài block if
      let newSystemRole: any = UserRole.PARTY_MEMBER;

      if (member.userId) {
        // FIX LỖI TYPE: Ép kiểu switch variable sang any để tránh lỗi comparison
        switch (dto.positionCode as any) {
          case PartyPosition.ADMIN:
            newSystemRole = UserRole.ADMIN;
            break;

          case PartyPosition.SECRETARY:
          case PartyPosition.DEPUTY_SECRETARY:
            newSystemRole = UserRole.SECRETARY;
            break;

          case PartyPosition.COMMITTEE_MEMBER:
            newSystemRole = UserRole.COMMITTEE_MEMBER;
            break;

          case PartyPosition.PARTY_MEMBER:
          case PartyPosition.OUTSTANDING_INDIVIDUAL: // FIX LỖI TÊN ENUM
            newSystemRole = UserRole.PARTY_MEMBER;
            break;

          default:
            newSystemRole = UserRole.PARTY_MEMBER;
            break;
        }

        // FIX LỖI UPDATE: Ép kiểu as any
        await manager.update(User, member.userId, {
          role: newSystemRole as any,
        });
      }

      return {
        message: 'Bổ nhiệm thành công',
        data: newAssignment,
        // Giờ biến newSystemRole đã được định nghĩa bên ngoài nên gọi được ở đây
        systemRoleUpdatedTo: member.userId ? newSystemRole : 'No User Linked',
      };
    });
  }

  // Hàm lấy lịch sử
  async getPositionHistory(memberId: string) {
    return await this.memberPositionRepo.find({
      where: { memberId },
      relations: ['position'],
      order: { appointedDate: 'DESC' },
    });
  }
}
