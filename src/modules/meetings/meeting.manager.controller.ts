import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  Delete,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'src/common/enums';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { ReviewLeaveRequestDto } from './dto/leave-request.dto';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import { UpdateMeetingMinutesDto } from './dto/update-meeting-minutes.dto';

@ApiTags('Meetings - Api Quản lý Cuộc họp của Chi ủy')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('meetings')
export class MeetingsManagerController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Tạo cuộc họp mới (Tự động sinh mã điểm danh)' })
  create(@GetCurrentUser('sub') userId: string, @Body() dto: CreateMeetingDto) {
    return this.meetingsService.create(userId, dto);
  }

  @Get(':id/pin')
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Lấy mã PIN hiện tại (Gọi mỗi 5s để cập nhật)' })
  getPin(@Param('id') id: string) {
    return this.meetingsService.getCurrentPin(id);
  }

  @Patch(':id/toggle-checkin')
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Bật/Tắt chế độ điểm danh' })
  toggleCheckIn(@Param('id') id: string) {
    return this.meetingsService.toggleCheckIn(id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Sửa nội dung cuộc họp' })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  update(@Param('id') id: string, @Body() updateMeetingDto: UpdateMeetingDto) {
    return this.meetingsService.update(id, updateMeetingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy/Xóa cuộc họp' })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  remove(@Param('id') id: string) {
    return this.meetingsService.remove(id);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'Xem báo cáo điểm danh (Ai đến, ai vắng)' })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  getAttendees(@Param('id') id: string) {
    return this.meetingsService.getAttendees(id);
  }

  @Patch('leave-requests/:attendeeId/review')
  @ApiOperation({ summary: 'Chi ủy phê duyệt đơn xin vắng mặt' })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  async reviewLeaveRequest(
    @Param('attendeeId') attendeeId: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.meetingsService.reviewLeaveRequest(attendeeId, dto);
  }

  @Patch(':id/end')
  @ApiOperation({
    summary: 'Kết thúc cuộc họp và tự động chốt danh sách vắng/có mặt',
  })
  @Roles('ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER')
  async endMeeting(@Param('id') meetingId: string) {
    return this.meetingsService.endMeeting(meetingId);
  }

  @Put(':id/attendance/manual')
  @ApiOperation({
    summary: 'Điểm danh thủ công cho cuộc họp',
  })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  async manualAttendance(
    @Param('id') meetingId: string,
    @Body() dto: ManualAttendanceDto,
    // @Req() req: any,
  ) {
    return await this.meetingsService.updateManualAttendance(
      meetingId,
      dto,
      // userId,
    );
  }

  @Patch(':id/minutes')
  @ApiOperation({
    summary: 'Cập nhật link biên bản cuộc họp',
  })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  async updateMeetingMinutes(
    @Param('id') meetingId: string,
    @Body() dto: UpdateMeetingMinutesDto,
  ) {
    return await this.meetingsService.updateMeetingMinutes(meetingId, dto);
  }
}
