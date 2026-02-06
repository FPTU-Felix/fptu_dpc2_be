// src/modules/meetings/meetings.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CheckInDto } from './dto/check-in.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { UserRole } from 'src/common/enums';

@ApiTags('Meetings - Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles(UserRole.SECRETARY, UserRole.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Tạo cuộc họp mới (Tự động sinh mã điểm danh)' })
  create(@GetCurrentUser('id') userId: string, @Body() dto: CreateMeetingDto) {
    return this.meetingsService.create(userId, dto);
  }

  @Get(':id/pin')
  @Roles(UserRole.SECRETARY, UserRole.COMMITTEE_MEMBER) // Chỉ Chi ủy mới được xem PIN để chiếu
  @ApiOperation({ summary: 'Lấy mã PIN hiện tại (Gọi mỗi 5s để cập nhật)' })
  getPin(@Param('id') id: string) {
    return this.meetingsService.getCurrentPin(id);
  }

  @Patch(':id/toggle-checkin')
  @Roles(UserRole.SECRETARY, UserRole.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Bật/Tắt chế độ điểm danh' })
  toggleCheckIn(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.meetingsService.toggleCheckIn(id, isActive);
  }

  @Post(':id/check-in')
  // User bình thường cũng gọi được
  @ApiOperation({ summary: 'Đảng viên nhập mã PIN để điểm danh' })
  checkIn(
    @GetCurrentUser('id') userId: string,
    @Param('id') meetingId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.meetingsService.submitCheckIn(userId, meetingId, dto);
  }
}
