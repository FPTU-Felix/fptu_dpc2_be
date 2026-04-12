import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PartyMembersService } from './party-members.service';
import { AssignPositionDto } from './dto/assign-position.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';

@ApiTags('Party Members - Quản lý Đảng viên')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('party-members')
export class PartyMembersController {
  constructor(private readonly partyMembersService: PartyMembersService) {}

  @Post(':id/assign-position')
  @Roles(UserRole.SECRETARY, UserRole.ADMIN) // Chỉ Bí thư hoặc Admin được bổ nhiệm
  @ApiOperation({
    summary: 'Bổ nhiệm chức vụ mới (Lưu lịch sử & Update quyền)',
  })
  async assignPosition(
    @GetCurrentUser('id') adminId: string,
    @Param('id') memberId: string,
    @Body() dto: AssignPositionDto,
  ) {
    return this.partyMembersService.assignPosition(adminId, memberId, dto);
  }

}
