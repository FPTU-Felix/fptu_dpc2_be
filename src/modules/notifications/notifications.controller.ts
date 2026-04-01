import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Notifications - Thông báo')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo' })
  @ApiQuery({
    name: 'isRead',
    required: false,
    type: Boolean,
    description: 'Truyền false để lấy tab Chưa đọc',
  })
  async getMyNotifications(
    @GetCurrentUser('sub') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('isRead') isRead?: string,
  ) {
    let readStatus: boolean | undefined = undefined;
    if (isRead === 'true') readStatus = true;
    if (isRead === 'false') readStatus = false;

    return await this.notificationsService.getUserNotifications(
      userId,
      { page, limit },
      readStatus,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết thông báo (Tự động đánh dấu đã đọc)' })
  async getNotificationDetail(
    @Param('id') id: string,
    @GetCurrentUser('sub') userId: string,
  ) {
    return await this.notificationsService.findOne(id, userId);
  }
}
