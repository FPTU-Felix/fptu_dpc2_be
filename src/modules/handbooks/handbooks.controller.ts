import {
  Controller,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { HandbooksService } from './handbooks.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ArticleFilterDto } from './dto/handbook.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Handbooks (Sổ tay Đảng viên)')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('handbooks')
export class HandbooksController {
  constructor(private readonly handbooksService: HandbooksService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách chuyên mục (Dành cho UI Lọc)' })
  async getCategories() {
    return await this.handbooksService.getCategoriesForUser();
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài viết (Chỉ lấy bài PUBLISHED)' })
  async getPublishedArticles(@Query() filters: ArticleFilterDto) {
    const { page = 1, limit = 10, ...restFilters } = filters;
    return await this.handbooksService.getPublishedArticles(
      { page, limit },
      restFilters,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Xem chi tiết 1 bài viết theo Slug (+1 Lượt xem)' })
  async getArticleBySlug(@Param('slug') slug: string) {
    return await this.handbooksService.getArticleBySlug(slug);
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Lấy tối đa 3 bài viết cùng chuyên mục' })
  async getRelatedArticles(@Param('slug') slug: string) {
    return await this.handbooksService.getRelatedArticles(slug);
  }
}
