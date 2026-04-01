import { Module } from '@nestjs/common';
import { HandbooksService } from './handbooks.service';
import { HandbooksController } from './handbooks.controller';
import { HandbookLink } from './entities/handbook-link.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Handbook } from './entities/handbook.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Handbook, HandbookLink, User]),
    NotificationsModule,
  ],
  controllers: [HandbooksController],
  providers: [HandbooksService],
})
export class HandbooksModule {}
