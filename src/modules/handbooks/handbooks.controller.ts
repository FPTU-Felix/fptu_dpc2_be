import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HandbooksService } from './handbooks.service';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateHandbookDto,
  CreateHandbookLinkDto,
  UpdateHandbookDto,
  UpdateHandbookLinkDto,
} from './dto/handbook.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Handbooks - Quản lý Cẩm nang & Tài liệu')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('handbooks')
export class HandbooksController {
  constructor(private readonly handbooksService: HandbooksService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả Cẩm nang (Có phân trang)' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Truyền true để chỉ lấy các Cẩm nang đang hiển thị',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Trang hiện tại (Mặc định: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi / trang (Mặc định: 10)',
  })
  findAll(
    @Query('activeOnly') activeOnly?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const isActive = activeOnly === 'true';
    return this.handbooksService.findAll({ page, limit }, isActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết 1 Cẩm nang' })
  findOne(@Param('id') id: string) {
    return this.handbooksService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'SECRETARY', 'DEPUTY_SECRETARY', 'COMMITTEE_MEMBER')
  @ApiOperation({ summary: 'Tạo Chủ đề Cẩm nang mới (Dành cho Chi ủy/Admin)' })
  create(@Body() createHandbookDto: CreateHandbookDto) {
    return this.handbooksService.create(createHandbookDto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SECRETARY', 'DEPUTY_SECRETARY', 'COMMITTEE_MEMBER')
  @ApiOperation({ summary: 'Cập nhật Chủ đề (Sửa tên, Ẩn/Hiện)' })
  update(
    @Param('id') id: string,
    @Body() updateHandbookDto: UpdateHandbookDto,
  ) {
    return this.handbooksService.update(id, updateHandbookDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SECRETARY', 'DEPUTY_SECRETARY', 'COMMITTEE_MEMBER')
  @ApiOperation({ summary: 'Xóa Chủ đề (Xóa luôn cả các links bên trong)' })
  remove(@Param('id') id: string) {
    return this.handbooksService.remove(id);
  }

  @Post(':id/links')
  @Roles('ADMIN', 'SECRETARY', 'DEPUTY_SECRETARY', 'COMMITTEE_MEMBER')
  @ApiOperation({ summary: 'Thêm đường dẫn tài liệu vào Cẩm nang' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  addLink(
    @Param('id') handbookId: string,
    @Body() createLinkDto: CreateHandbookLinkDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.handbooksService.addLink(handbookId, createLinkDto, file);
  }

  @Patch('links/:linkId')
  @Roles('ADMIN', 'SECRETARY', 'DEPUTY_SECRETARY', 'COMMITTEE_MEMBER')
  @ApiOperation({
    summary: 'Cập nhật thông tin đường dẫn (Hỗ trợ đổi file mới)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  updateLink(
    @Param('linkId') linkId: string,
    @Body() updateLinkDto: UpdateHandbookLinkDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.handbooksService.updateLink(linkId, updateLinkDto, file);
  }

  @Delete('links/:linkId')
  @Roles('ADMIN', 'SECRETARY', 'DEPUTY_SECRETARY', 'COMMITTEE_MEMBER')
  @ApiOperation({ summary: 'Xóa đường dẫn tài liệu' })
  removeLink(@Param('linkId') linkId: string) {
    return this.handbooksService.removeLink(linkId);
  }
}
