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
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto.js';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto.js';
import { PaymentMethodsService } from './payment-methods.service.js';

@ApiTags('payment-methods')
@ApiBearerAuth()
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethods: PaymentMethodsService) {}

  /** Formas de pagamento do usuário, em ordem alfabética */
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<PaymentMethodResponseDto[]> {
    return this.paymentMethods.list(user.id);
  }

  /** Cria a forma de pagamento. Cartão de crédito exige closingDay e dueDay */
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    return this.paymentMethods.create(user.id, dto);
  }

  /** Edita. Mudar os dias da fatura recalcula em qual mês cada cobrança entra */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @UuidParam('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    return this.paymentMethods.update(user.id, id, dto);
  }

  /** Exclui. Responde 409 se algum gasto usa ou já usou esta forma de pagamento */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @UuidParam('id') id: string,
  ): Promise<void> {
    return this.paymentMethods.remove(user.id, id);
  }
}
