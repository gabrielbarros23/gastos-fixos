import { Module } from '@nestjs/common';
import { OccurrencesController } from './occurrences.controller.js';
import { OccurrencesService } from './occurrences.service.js';
import { SummaryService } from './summary.service.js';

@Module({
  controllers: [OccurrencesController],
  providers: [OccurrencesService, SummaryService],
  exports: [OccurrencesService],
})
export class OccurrencesModule {}
