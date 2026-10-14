import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth/auth-user.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { UuidParam } from '../common/http/uuid-param.js';
import {
  CreateExpensePaymentMethodDto,
  UpdateExpensePaymentMethodDto,
} from './dto/expense-payment-method.dto.js';
import { ExpensePaymentMethodResponseDto } from './dto/expense-response.dto.js';
import { ExpensePaymentMethodsService } from './expense-payment-methods.service.js';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses/:expenseId/payment-methods')
export class ExpensePaymentMethodsController {
  constructor(private readonly history: ExpensePaymentMethodsService) {}

  /** Histórico da forma de pagamento, do mais antigo para o mais recente */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
  ): Promise<ExpensePaymentMethodResponseDto[]> {
    return this.history.list(user.id, expenseId);
  }

  /**
   * Troca a forma de pagamento a partir de effectiveFrom (os meses anteriores
   * não mudam). paymentMethodId null = sem forma de pagamento. 409 se já houver
   * uma troca nessa data.
   */
  @Post()
  add(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
    @Body() dto: CreateExpensePaymentMethodDto,
  ): Promise<ExpensePaymentMethodResponseDto> {
    return this.history.add(user.id, expenseId, dto);
  }

  /** Corrige um registro (forma escolhida errada): muda também os meses passados */
  @Patch(':assignmentId')
  correct(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
    @UuidParam('assignmentId') assignmentId: string,
    @Body() dto: UpdateExpensePaymentMethodDto,
  ): Promise<ExpensePaymentMethodResponseDto> {
    return this.history.correct(user.id, expenseId, assignmentId, dto);
  }

  /** Desfaz uma troca: o período volta a usar a forma de pagamento anterior */
  @Delete(':assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
    @UuidParam('assignmentId') assignmentId: string,
  ): Promise<void> {
    return this.history.remove(user.id, expenseId, assignmentId);
  }
}
