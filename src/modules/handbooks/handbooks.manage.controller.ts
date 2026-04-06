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
  ParseUUIDPipe,
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
  ArticleFilterDto,
  CreateArticleDto,
  CreateCategoryDto,
  UpdateArticleDto,
  UpdateCategoryDto,
} from './dto/handbook.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Handbooks Management (Quản lý sổ tay Đảng viên)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('handbooks')
export class HandbooksManageController {
  constructor(private readonly handbooksService: HandbooksService) {}

  @Get('admin/list')
  @Roles(
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'CMS: Lấy TẤT CẢ bài viết & Thống kê Dashboard' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAdminArticles(@Query() filters: ArticleFilterDto) {
    const { page = 1, limit = 10 } = filters;
    return await this.handbooksService.getAdminArticles({ page, limit });
  }

  @Post()
  @Roles(
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'CMS: Tạo bài viết mới' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async createArticle(
    @Body() dto: CreateArticleDto,
    @GetCurrentUser('sub') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.handbooksService.createArticle(dto, file, userId);
  }

  @Patch(':id')
  @Roles(
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'CMS: Cập nhật bài viết' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async updateArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.handbooksService.updateArticle(id, dto, file);
  }

  @Delete(':id')
  @Roles(
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'CMS: Xóa bài viết' })
  async deleteArticle(@Param('id', ParseUUIDPipe) id: string) {
    return await this.handbooksService.deleteArticle(id);
  }

  // --- CMS CHUYÊN MỤC ---

  @Post('categories')
  @Roles(
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'CMS: Tạo chuyên mục mới' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return await this.handbooksService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles(
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'CMS: Sửa chuyên mục' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return await this.handbooksService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles(
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'CMS: Xóa chuyên mục' })
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return await this.handbooksService.deleteCategory(id);
  }
}
