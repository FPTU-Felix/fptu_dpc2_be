import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { SystemLog } from './entities/system-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemLog])],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
