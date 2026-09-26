import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../common/auth/auth-user.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { UuidParam } from '../common/http/uuid-param.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import {
  ExpenseDetailResponseDto,
  ExpenseResponseDto,
} from './dto/expense-response.dto.js';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ExpensesService } from './expenses.service.js';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  /** Gastos com o valor vigente hoje e o próximo vencimento */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListExpensesQueryDto,
  ): Promise<ExpenseResponseDto[]> {
    return this.expenses.list(user.id, query);
  }

  /** Detalhe do gasto com o histórico de valores */
  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @UuidParam('id') id: string,
  ): Promise<ExpenseDetailResponseDto> {
    return this.expenses.get(user.id, id);
  }

  /** Cria o gasto. Informe endDate OU installments (a data de fim é calculada) */
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseDetailResponseDto> {
    return this.expenses.create(user.id, dto);
  }

  /** Edita dados e regra. O valor muda por POST /expenses/:id/amounts */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @UuidParam('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseDetailResponseDto> {
    return this.expenses.update(user.id, id, dto);
  }

  /** Cancela a partir de hoje: vencimentos anteriores continuam no calendário */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @CurrentUser() user: AuthUser,
    @UuidParam('id') id: string,
  ): Promise<ExpenseDetailResponseDto> {
    return this.expenses.deactivate(user.id, id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @CurrentUser() user: AuthUser,
    @UuidParam('id') id: string,
  ): Promise<ExpenseDetailResponseDto> {
    return this.expenses.activate(user.id, id);
  }

  /** Exclui definitivamente, junto com o histórico (para gasto criado por engano) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @UuidParam('id') id: string,
  ): Promise<void> {
    return this.expenses.remove(user.id, id);
  }
}
