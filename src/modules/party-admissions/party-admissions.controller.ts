import { 
  Controller, 
  Get, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PartyAdmissionsService } from './party-admissions.service';

// Security & Authorization
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { UserRole, AdmissionStatusEnum } from 'src/common/enums';

@ApiTags('Party Admissions - Quản lý kết nạp Đảng')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('party-admissions')
export class PartyAdmissionsController {
  constructor(private readonly partyAdmissionsService: PartyAdmissionsService) {}

  // =========================================================
  // 1. DÀNH CHO NGƯỜI DÙNG (QCUT / ĐẢNG VIÊN)
  // =========================================================
  
  @Get('my-progress')
  @ApiOperation({ summary: 'Cá nhân tự theo dõi tiến độ hồ sơ của mình' })
  @Roles(UserRole.OUTSTANDING_INDIVIDUAL, UserRole.PARTY_MEMBER, UserRole.ADMIN)
  trackMyProgress(@GetCurrentUser('sub') userId: string) {
    return this.partyAdmissionsService.trackAdmissionProgress(userId);
  }

  @Patch(':id/submit-docs')
  @ApiOperation({ summary: 'QCUT nộp hoặc cập nhật bộ hồ sơ' })
  @Roles(UserRole.OUTSTANDING_INDIVIDUAL, UserRole.ADMIN)
  submitDocs(
    @Param('id') id: string,
    @Body('documentsUrl') documentsUrl: string,
  ) {
    return this.partyAdmissionsService.submitDocuments(id, documentsUrl);
  }

  // =========================================================
  // 2. DÀNH CHO QUẢN TRỊ (Chi ủy, PBT, Bí thư)
  // =========================================================

  @Patch(':id/manage-status')
  @ApiOperation({ 
    summary: 'Cập nhật trạng thái theo thẩm quyền (Chi ủy: CHECKED | Bí thư/PBT: VERIFIED/REJECTED)' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(AdmissionStatusEnum) },
        remark: { type: 'string' }
      }
    }
  })
  @Roles(UserRole.SECRETARY, UserRole.DEPUTY_SECRETARY, UserRole.COMMITTEE_MEMBER, UserRole.ADMIN)
  manageProgress(
    @Param('id') id: string,
    @Body('status') nextStatus: AdmissionStatusEnum,
    @Body('remark') remark: string,
    @GetCurrentUser('roleName') roleName: string,
  ) {
    return this.partyAdmissionsService.manageProgress(id, nextStatus, roleName, remark);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách hồ sơ (Cho Admin/Lãnh đạo)' })
  @Roles(UserRole.SECRETARY, UserRole.DEPUTY_SECRETARY, UserRole.ADMIN)
  findAll() {
    return this.partyAdmissionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết 1 hồ sơ' })
  @Roles(UserRole.SECRETARY, UserRole.DEPUTY_SECRETARY, UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.partyAdmissionsService.findOne(id);
  }


}