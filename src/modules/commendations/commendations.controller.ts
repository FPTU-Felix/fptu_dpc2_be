import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CommendationsService } from './commendations.service';
import { CreateCommendationDto } from './dto/create-commendation.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from 'src/common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Commendations (Khen thưởng Đảng viên)')
@Controller('commendations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class CommendationsController {
  constructor(private readonly commendationsService: CommendationsService) {}

  @Post()
  @Roles(UserRole.DEPUTY_SECRETARY)
  @ApiOperation({ summary: 'Chi ủy ra Quyết định Khen thưởng Đảng viên' })
  async create(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: CreateCommendationDto,
  ) {
    return await this.commendationsService.create(userId, dto);
  }

  @Get('member/:memberId')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Xem lịch sử khen thưởng của 1 Đảng viên' })
  async getByMember(@Param('memberId') memberId: string) {
    return await this.commendationsService.findByMember(memberId);
  }
}
