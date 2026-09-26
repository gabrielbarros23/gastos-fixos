import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth/auth-user.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { OccurrencesQueryDto } from './dto/occurrences-query.dto.js';
import { OccurrencesResponseDto } from './dto/occurrences-response.dto.js';
import { SummaryQueryDto, SummaryResponseDto } from './dto/summary.dto.js';
import { OccurrencesService } from './occurrences.service.js';
import { SummaryService } from './summary.service.js';

@ApiTags('occurrences')
@ApiBearerAuth()
@Controller()
export class OccurrencesController {
  constructor(
    private readonly occurrences: OccurrencesService,
    private readonly summary: SummaryService,
  ) {}

  /**
   * Vencimentos do período, agrupados por dia, com o total previsto e pago de
   * cada dia e do período. Base do calendário.
   */
  @Get('occurrences')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: OccurrencesQueryDto,
  ): Promise<OccurrencesResponseDto> {
    return this.occurrences.list(user.id, query);
  }

  /** Previsto x pago do mês, divisão por categoria e projeção dos 6 meses seguintes */
  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: SummaryQueryDto,
  ): Promise<SummaryResponseDto> {
    return this.summary.get(user.id, query);
  }
}
