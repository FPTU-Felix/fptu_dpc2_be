import { Controller, Get, UseGuards } from '@nestjs/common';
import { PartyCellsService } from './party-cells.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiBearerAuth('access-token')
@ApiTags('Party Cells - API Cho Chi bộ')
@Controller('party-cells')
export class PartyCellsController {
  constructor(private readonly partyCellsService: PartyCellsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả Chi bộ (Dùng cho form chọn Dropdown)',
  })
  async getAllPartyCells() {
    return await this.partyCellsService.findAllForDropdown();
  }
}
