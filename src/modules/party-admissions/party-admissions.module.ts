import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Thêm dòng này
import { PartyAdmissionsService } from './party-admissions.service';
import { PartyAdmissionsController } from './party-admissions.controller';

// Import 2 Entity này nữa
import { PartyAdmission } from './entities/party-admission.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PartyAdmission, PartyMember]),
  ],
  controllers: [PartyAdmissionsController],
  providers: [PartyAdmissionsService],
})
export class PartyAdmissionsModule {}