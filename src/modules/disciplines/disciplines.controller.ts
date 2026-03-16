import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';

@ApiTags('Disciplines (Kỷ luật Đảng viên)')
@Controller('disciplines')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class DisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  @Post()
  @Roles(UserRole.SECRETARY, UserRole.DEPUTY_SECRETARY)
  @ApiOperation({ summary: 'Chi ủy ra Quyết định Kỷ luật Đảng viên' })
  async create(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: CreateDisciplineDto,
  ) {
    return await this.disciplinesService.create(userId, dto);
  }

  @Get('member/:memberId')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Xem lịch sử kỷ luật của 1 Đảng viên' })
  async getByMember(@Param('memberId') memberId: string) {
    return await this.disciplinesService.findByMember(memberId);
  }
}
