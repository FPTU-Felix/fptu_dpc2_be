import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PartyMember } from './entities/party-member.entity';
import { PartyMemberPosition } from 'src/modules/party-positions/entities/party-member-position.entity';
import { PartyPosition as PartyPositionEntity } from '../party-positions/entities/party-position.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { AssignPositionDto } from './dto/assign-position.dto';
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

  async assignPosition(
    adminId: string,
    memberId: string,
    dto: AssignPositionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const positionMeta = await manager.findOne(PartyPositionEntity, {
        where: { code: dto.positionCode },
      });

      if (!positionMeta) {
        throw new BadRequestException(
          `Mã chức vụ "${dto.positionCode}" chưa được định nghĩa.`,
        );
      }
      const member = await manager.findOne(PartyMember, {
        where: { id: memberId },
        relations: ['user'],
      });
      if (!member)
        throw new NotFoundException('Không tìm thấy hồ sơ Đảng viên');
      const currentPosition = await manager.findOne(PartyMemberPosition, {
        where: {
          member: { id: member.id },
          isCurrent: true,
        },
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

      const newAssignment = manager.create(PartyMemberPosition, {
        memberId: member.id,
        partyCellId: member.partyCellId,
        positionId: positionMeta.id,
        appointedDate: actionDate,
        isCurrent: true,
        note: dto.note || 'Bổ nhiệm qua hệ thống',
      });

      await manager.save(newAssignment);
      let targetRoleName: any = UserRole.PARTY_MEMBER;
      if (member.userId) {
        switch (dto.positionCode as any) {
          case PartyPosition.ADMIN:
            targetRoleName = UserRole.ADMIN;
            break;

          case PartyPosition.SECRETARY:
          case PartyPosition.DEPUTY_SECRETARY:
            targetRoleName = UserRole.SECRETARY;
            break;

          case PartyPosition.COMMITTEE_MEMBER:
            targetRoleName = UserRole.COMMITTEE_MEMBER;
            break;

          case PartyPosition.PARTY_MEMBER:
          case PartyPosition.OUTSTANDING_INDIVIDUAL:
            targetRoleName = UserRole.PARTY_MEMBER;
            break;

          default:
            targetRoleName = UserRole.PARTY_MEMBER;
            break;
        }
        const roleEntity = await manager.findOne(Role, {
          where: { name: targetRoleName } as any,
        });
        if (roleEntity) {
          await manager.update(User, member.userId, {
            roleId: roleEntity.id,
          });
        } else {
          console.warn(
            `⚠️ Cảnh báo: Không tìm thấy Role có tên "${targetRoleName}" trong DB! User chưa được cập nhật quyền.`,
          );
        }
      }

      return {
        message: 'Bổ nhiệm thành công',
        data: newAssignment,
        roleAssigned: targetRoleName,
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
