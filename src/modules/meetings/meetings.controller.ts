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
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { UserRole } from 'src/common/enums';
import { GetMeetingsQueryDto } from './dto/get-meetings-query.dto';
import { SubmitLeaveRequestDto } from './dto/leave-request.dto';
import { OnlineAttendanceDto } from './dto/online-attendance.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Meetings - API Cuộc họp của Đảng viên')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}
  
  @Get('my-attendance')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Đảng viên tự xem lịch sử điểm danh của bản thân' })
  async getMyAttendance(
    @GetCurrentUser('sub') userId: string,
    @Query('year') year?: string,
  ) {
    const targetYear = year ? parseInt(year) : undefined;
    return await this.meetingsService.getMyAttendanceHistory(
      userId,
      targetYear,
    );
  }

  @Post(':id/check-in')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({
    summary: 'Đảng viên quét mã QR để điểm danh',
    description: 'Đảng viên dùng App quét mã QR tĩnh để ghi nhận sự có mặt',
  })
  checkIn(
    @GetCurrentUser('sub') userId: string,
    @Param('id') meetingId: string,
  ) {
    return this.meetingsService.submitCheckIn(userId, meetingId);
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

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách lịch họp (hỗ trợ lọc theo tháng/năm)',
  })
  async getMeetingsSchedule(@Query() query: GetMeetingsQueryDto) {
    return this.meetingsService.getMeetingsSchedule(query);
  }

  @Post(':id/leave-requests')
  @ApiOperation({ summary: 'Đảng viên nộp đơn xin vắng mặt' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  async submitLeaveRequest(
    @Param('id', ParseUUIDPipe) meetingId: string,
    @Body() dto: SubmitLeaveRequestDto,
    @GetCurrentUser('sub') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.meetingsService.submitLeaveRequest(
      meetingId,
      userId,
      dto,
      file,
    );
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
    @Param('id', ParseUUIDPipe) meetingId: string,
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
