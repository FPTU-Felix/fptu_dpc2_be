import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PartyFeesService } from './party-fees.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GetPartyFeesDto } from './dto/party-fee.dto';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';
import { MyFeeQueryDto } from './dto/my-fee.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';

@ApiTags('Party Fees - Quản lý Đảng phí')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('party-fees')
export class PartyFeesController {
  constructor(private readonly partyFeesService: PartyFeesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách Đảng phí của Chi bộ theo tháng/năm' })
  async getFeesList(@Query() dto: GetPartyFeesDto) {
    const { page = 1, limit = 10 } = dto;
    return await this.partyFeesService.getFeesByChiBo(dto, { page, limit });
  }

  @Patch(':id/confirm')
  @Roles(UserRole.SECRETARY)
  @ApiOperation({ summary: 'Xác nhận đã thu Đảng phí (Chuyển sang PAID)' })
  async confirmPayment(
    @Param('id') feeId: string,
    @GetCurrentUser('sub') userId: string,
  ) {
    return await this.partyFeesService.confirmPayment(feeId, userId);
  }

  @ApiOperation({
    summary: 'Đảng viên tự kiểm tra trạng thái đóng phí của mình',
  })
  @Get('my-fees')
  async getMyFees(
    @GetCurrentUser('sub') userId: string,
    @Query() query: MyFeeQueryDto,
  ) {
    const targetYear = query.year
      ? parseInt(query.year)
      : new Date().getFullYear();

    return await this.partyFeesService.getMyFeeStatus(userId, targetYear);
  }
}
