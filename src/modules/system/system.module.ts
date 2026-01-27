import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { SystemAuditLog } from './entities/system-audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemAuditLog])],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
