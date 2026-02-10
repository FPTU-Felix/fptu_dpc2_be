import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  Delete,
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

@ApiTags('Meetings - Api Quản lý Cuộc họp của Chi ủy')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('meetings')
export class MeetingsManagerController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @Roles(UserRole.SECRETARY, UserRole.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Tạo cuộc họp mới (Tự động sinh mã điểm danh)' })
  create(@GetCurrentUser('sub') userId: string, @Body() dto: CreateMeetingDto) {
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
  @Patch(':id')
  @ApiOperation({ summary: 'Sửa nội dung cuộc họp' })
  update(@Param('id') id: string, @Body() updateMeetingDto: UpdateMeetingDto) {
    return this.meetingsService.update(id, updateMeetingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy/Xóa cuộc họp' })
  remove(@Param('id') id: string) {
    return this.meetingsService.remove(id);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'Xem báo cáo điểm danh (Ai đến, ai vắng)' })
  getAttendees(@Param('id') id: string) {
    return this.meetingsService.getAttendees(id);
  }
}
