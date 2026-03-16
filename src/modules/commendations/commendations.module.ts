import { Module } from '@nestjs/common';
import { CommendationsService } from './commendations.service';
import { CommendationsController } from './commendations.controller';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commendation } from './entities/commendation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Commendation, PartyMember])],
  controllers: [CommendationsController],
  providers: [CommendationsService],
  exports: [CommendationsService],
})
export class CommendationsModule {}
