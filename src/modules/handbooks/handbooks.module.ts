import { Module } from '@nestjs/common';
import { HandbooksService } from './handbooks.service';
import { HandbooksController } from './handbooks.controller';
import { HandbookLink } from './entities/handbook-link.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Handbook } from './entities/handbook.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Handbook, HandbookLink])],
  controllers: [HandbooksController],
  providers: [HandbooksService],
})
export class HandbooksModule {}
