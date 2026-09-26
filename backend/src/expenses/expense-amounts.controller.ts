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
import { CreateAmountDto } from './dto/create-amount.dto.js';
import { AmountResponseDto } from './dto/expense-response.dto.js';
import { UpdateAmountDto } from './dto/update-amount.dto.js';
import { ExpenseAmountsService } from './expense-amounts.service.js';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses/:expenseId/amounts')
export class ExpenseAmountsController {
  constructor(private readonly amounts: ExpenseAmountsService) {}

  /** Histórico de valores, do mais antigo para o mais recente */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
  ): Promise<AmountResponseDto[]> {
    return this.amounts.list(user.id, expenseId);
  }

  /** Registra um novo valor, vigente a partir de effectiveFrom (409 se já houver um nessa data) */
  @Post()
  add(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
    @Body() dto: CreateAmountDto,
  ): Promise<AmountResponseDto> {
    return this.amounts.add(user.id, expenseId, dto);
  }

  /**
   * Corrige um valor digitado errado (inclusive o inicial). Diferente de uma
   * mudança de preço: altera também os vencimentos já passados.
   */
  @Patch(':amountId')
  correct(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
    @UuidParam('amountId') amountId: string,
    @Body() dto: UpdateAmountDto,
  ): Promise<AmountResponseDto> {
    return this.amounts.correct(user.id, expenseId, amountId, dto);
  }

  /** Desfaz uma mudança de valor (o valor inicial não pode ser removido) */
  @Delete(':amountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @UuidParam('expenseId') expenseId: string,
    @UuidParam('amountId') amountId: string,
  ): Promise<void> {
    return this.amounts.remove(user.id, expenseId, amountId);
  }
}
