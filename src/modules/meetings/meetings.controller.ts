// src/modules/meetings/meetings.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  ParseUUIDPipe,
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
import { SubmitLeaveRequestDto } from './dto/leave-request.dto';
import { OnlineAttendanceDto } from './dto/online-attendance.dto';

@ApiTags('Meetings - API Cuộc họp của Đảng viên')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post(':id/check-in')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Đảng viên nhập mã PIN để điểm danh' })
  checkIn(
    @GetCurrentUser('sub') userId: string,
    @Param('id') meetingId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.meetingsService.submitCheckIn(userId, meetingId, dto);
  }

  @Post(':id/check-in-online')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({
    summary: 'FE Extension: Bắn 1 lần duy nhất khi vừa join Meet',
  })
  async onlineCheckIn(
    @GetCurrentUser('sub') userId: string,
    @Param('id') meetingId: string,
    @Body() dto: OnlineAttendanceDto,
  ) {
    return this.meetingsService.onlineCheckIn(
      meetingId,
      userId,
      dto.currentUrl,
    );
  }

  // @Get()
  // @ApiOperation({ summary: '1. Xem danh sách cuộc họp (Lọc Sắp tới/Lịch sử)' })
  // findAll(@Query() filter: FilterMeetingDto) {
  //   return this.meetingsService.findAll(filter);
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết 1 cuộc họp' })
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.findOne(id);
  }

  @Get() // Route sẽ là GET /meetings
  @ApiOperation({
    summary: 'Lấy danh sách lịch họp (hỗ trợ lọc theo tháng/năm)',
  })
  async getMeetingsSchedule(@Query() query: GetMeetingsQueryDto) {
    return this.meetingsService.getMeetingsSchedule(query);
  }

  @Post(':id/leave-requests')
  @ApiOperation({ summary: 'Đảng viên nộp đơn xin vắng mặt' })
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  async submitLeaveRequest(
    @Param('id') meetingId: string,
    @Body() dto: SubmitLeaveRequestDto,
    @GetCurrentUser('sub') userId: string,
  ) {
    return this.meetingsService.submitLeaveRequest(meetingId, userId, dto);
  }
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @Post(':id/heartbeat')
  @ApiOperation({
    summary: 'FE Extension: Bắn lặp lại mỗi 60s để cộng dồn giờ',
  })
  async recordHeartbeat(
    @Param('id') meetingId: string,
    @Body() dto: OnlineAttendanceDto,
    @GetCurrentUser('sub') userId: string,
  ) {
    return this.meetingsService.recordHeartbeat(
      meetingId,
      userId,
      dto.currentUrl,
    );
  }
}
