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

@ApiTags('Party Fees - Quản lý Đảng phí')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Xác nhận đã thu Đảng phí (Chuyển sang PAID)' })
  async confirmPayment(
    @Param('id') feeId: string,
    @GetCurrentUser('sub') userId: string, // ID của Bí thư/người thao tác
  ) {
    return await this.partyFeesService.confirmPayment(feeId, userId);
  }
}
