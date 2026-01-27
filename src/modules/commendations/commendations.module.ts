import { Module } from '@nestjs/common';
import { CommendationsService } from './commendations.service';
import { CommendationsController } from './commendations.controller';

@Module({
  controllers: [CommendationsController],
  providers: [CommendationsService],
})
export class CommendationsModule {}
