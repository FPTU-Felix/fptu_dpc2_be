import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Import cái này
import { DocumentCategoriesService } from './document-categories.service';
import { DocumentCategoriesController } from './document-categories.controller';
import { DocumentCategory } from './entities/document-category.entity'; // Import Entity của bạn

@Module({
  imports: [
    // QUAN TRỌNG: Phải đăng ký Entity ở đây để DocumentCategoriesService có thể sử dụng @InjectRepository
    TypeOrmModule.forFeature([DocumentCategory]), 
  ],
  controllers: [DocumentCategoriesController],
  providers: [DocumentCategoriesService],
  exports: [DocumentCategoriesService], 
})
export class DocumentCategoriesModule {}