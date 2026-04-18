import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, ParseUUIDPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentCategoriesService } from './document-categories.service';
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto';
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';

@ApiTags('Document Categories - Quản lý loại tài liệu')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('document-categories')
export class DocumentCategoriesController {
  constructor(private readonly documentCategoriesService: DocumentCategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Tạo mới danh mục tài liệu' })
  create(@Body() createDocumentCategoryDto: CreateDocumentCategoryDto) {
    return this.documentCategoriesService.create(createDocumentCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả danh mục tài liệu' })
  findAll() {
    return this.documentCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết danh mục tài liệu' })
  findOne(@Param('id', ParseUUIDPipe) id: string) { // Đổi sang string và ParseUUIDPipe
    return this.documentCategoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Cập nhật danh mục tài liệu' })
  update(
    @Param('id', ParseUUIDPipe) id: string, // Đổi sang string và ParseUUIDPipe
    @Body() updateDocumentCategoryDto: UpdateDocumentCategoryDto
  ) {
    return this.documentCategoriesService.update(id, updateDocumentCategoryDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Xóa danh mục tài liệu' })
  remove(@Param('id', ParseUUIDPipe) id: string) { // Đổi sang string và ParseUUIDPipe
    return this.documentCategoriesService.remove(id);
  }
}