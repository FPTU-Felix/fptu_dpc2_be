// src/modules/meetings/meetings.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CheckInDto } from './dto/check-in.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { UserRole } from 'src/common/enums';
import { GetMeetingsQueryDto } from './dto/get-meetings-query.dto';

@ApiTags('Meetings - API Cuộc họp của Đảng viên')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post(':id/check-in')
  @Roles(UserRole.PARTY_MEMBER)
  // User bình thường cũng gọi được
  @ApiOperation({ summary: 'Đảng viên nhập mã PIN để điểm danh' })
  checkIn(
    @GetCurrentUser('sub') userId: string,
    @Param('id') meetingId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.meetingsService.submitCheckIn(userId, meetingId, dto);
  }

  // @Get()
  // @ApiOperation({ summary: '1. Xem danh sách cuộc họp (Lọc Sắp tới/Lịch sử)' })
  // findAll(@Query() filter: FilterMeetingDto) {
  //   return this.meetingsService.findAll(filter);
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết 1 cuộc họp' })
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @Get() // Route sẽ là GET /meetings
  @ApiOperation({
    summary: 'Lấy danh sách lịch họp (hỗ trợ lọc theo tháng/năm)',
  })
  async getMeetingsSchedule(@Query() query: GetMeetingsQueryDto) {
    return this.meetingsService.getMeetingsSchedule(query);
  }
}
