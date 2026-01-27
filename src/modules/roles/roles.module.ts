import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // <--- Luôn phải có
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role } from './entities/role.entity'; // <--- Import Entity

@Module({
  imports: [TypeOrmModule.forFeature([Role])], // <--- Đăng ký
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService], // Export để AuthModule dùng
})
export class RolesModule {}
