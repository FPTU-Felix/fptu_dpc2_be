import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyCellsService } from './party-cells.service';
import { PartyCellsController } from './party-cells.controller';
import { PartyCell } from './entities/party-cell.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PartyCell])],
  controllers: [PartyCellsController],
  providers: [PartyCellsService],
})
export class PartyCellsModule {}
