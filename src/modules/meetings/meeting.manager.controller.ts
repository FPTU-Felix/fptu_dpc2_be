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
  UseInterceptors,
  UploadedFiles,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';
import { AttendeeStatus, UserRole } from 'src/common/enums';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { ReviewLeaveRequestDto } from './dto/leave-request.dto';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import { UploadMeetingDocumentsDto } from './dto/upload-meeting-documents.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { GetClientIp } from '../auth/decorators/get-client-ip.decorator';

@ApiTags('Meetings - Api Quản lý Cuộc họp của Chi ủy')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('meetings')
export class MeetingsManagerController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('leave-requests')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY, UserRole.DEPUTY_SECRETARY)
  @ApiOperation({
    summary: 'Lấy danh sách đơn xin nghỉ họp (Phân trang + Lọc)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AttendeeStatus,
    description: 'Trạng thái đơn xin nghỉ',
  })
  async getLeaveRequests(
    @GetCurrentUser('sub') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: AttendeeStatus,
  ) {
    return await this.meetingsService.findAllLeaveRequests(
      { page, limit },
      userId,
      status,
    );
  }

  @Post()
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Tạo cuộc họp mới (Tự động sinh mã điểm danh)' })
  create(
    @GetCurrentUser('sub') userId: string,
    @GetClientIp() ip: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.meetingsService.create(userId, ip, dto);
  }

  @Get(':id/pin')
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Lấy mã PIN hiện tại (Gọi mỗi 30s để cập nhật)' })
  getPin(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.getCurrentPin(id);
  }

  @Patch(':id/toggle-checkin')
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Bật/Tắt chế độ điểm danh' })
  toggleCheckIn(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.toggleCheckIn(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa nội dung cuộc họp' })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  update(
    @GetCurrentUser('sub') actorId: string,
    @GetClientIp() ip: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
  ) {
    return this.meetingsService.update(id, actorId, ip, updateMeetingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy/Xóa cuộc họp' })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('sub') actorId: string,
    @GetClientIp() ip: string,
  ) {
    return this.meetingsService.remove(id, actorId, ip);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'Xem báo cáo điểm danh (Ai đến, ai vắng)' })
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  getAttendees(@Param('id', ParseUUIDPipe) id: string) {
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
    @Param('attendeeId', ParseUUIDPipe) attendeeId: string,
    @GetCurrentUser('sub') actorId: string,
    @GetClientIp() ip: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    return this.meetingsService.reviewLeaveRequest(
      attendeeId,
      actorId,
      ip,
      dto,
    );
  }

  @Patch(':id/end')
  @ApiOperation({
    summary: 'Kết thúc cuộc họp và tự động chốt danh sách vắng/có mặt',
  })
  @Roles(UserRole.SECRETARY, UserRole.COMMITTEE_MEMBER, UserRole.ADMIN)
  async endMeeting(@Param('id', ParseUUIDPipe) meetingId: string) {
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
    @Param('id', ParseUUIDPipe) meetingId: string,
    @Body() dto: ManualAttendanceDto,
    @GetCurrentUser('sub') actorId: string,
    @GetClientIp() ip: string,
  ) {
    return await this.meetingsService.updateManualAttendance(
      meetingId,
      actorId,
      ip,
      dto,
    );
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Tải lên nhiều biên bản/tài liệu cho cuộc họp' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  @Roles(
    UserRole.SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.DEPUTY_SECRETARY,
  )
  async uploadDocuments(
    @Param('id', ParseUUIDPipe) meetingId: string,
    @GetCurrentUser('sub') actorId: string,
    @GetClientIp() ip: string,
    @Body() dto: UploadMeetingDocumentsDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.meetingsService.uploadMeetingDocuments(
      meetingId,
      actorId,
      ip,
      files,
    );
  }
}
