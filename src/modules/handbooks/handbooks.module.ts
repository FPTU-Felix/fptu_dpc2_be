import { Module } from '@nestjs/common';
import { HandbooksService } from './handbooks.service';
import { HandbooksController } from './handbooks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { HandbookArticle } from './entities/handbook-article.entity';
import { HandbookCategory } from './entities/handbook-category.entity';
import { HandbooksManageController } from './handbooks.manage.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([HandbookArticle, HandbookCategory, User]),
    NotificationsModule,
  ],
  controllers: [HandbooksController, HandbooksManageController],
  providers: [HandbooksService],
})
export class HandbooksModule {}
