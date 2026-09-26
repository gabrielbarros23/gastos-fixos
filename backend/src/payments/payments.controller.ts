import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth/auth-user.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { CalendarDateParam } from '../common/http/calendar-date-param.js';
import { UuidParam } from '../common/http/uuid-param.js';
import type { CalendarDate } from '../domain/calendar-date.js';
import { OccurrenceResponseDto } from '../occurrences/dto/occurrence-response.dto.js';
import { MarkPaidDto } from './dto/mark-paid.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('payments')
@ApiBearerAuth()
@ApiParam({
  name: 'dueDate',
  example: '2026-10-10',
  description: 'Vencimento (AAAA-MM-DD)',
})
@Controller('expenses/:expenseId/occurrences/:dueDate/payment')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Marca o vencimento como pago (sem corpo: valor previsto, pago hoje).
   * PUT idempotente: chamar de novo substitui o pagamento.
   */
  @Put()
  markPaid(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
    @CalendarDateParam('dueDate') dueDate: CalendarDate,
    @Body() dto: MarkPaidDto,
  ): Promise<OccurrenceResponseDto> {
    return this.payments.markPaid(user.id, expenseId, dueDate, dto);
  }

  /** Desmarca o pagamento (idempotente) */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  unmarkPaid(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
    @CalendarDateParam('dueDate') dueDate: CalendarDate,
  ): Promise<void> {
    return this.payments.unmarkPaid(user.id, expenseId, dueDate);
  }
}
