import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module.js';
import { ExpenseAmountsController } from './expense-amounts.controller.js';
import { ExpenseAmountsService } from './expense-amounts.service.js';
import { ExpensePaymentMethodsController } from './expense-payment-methods.controller.js';
import { ExpensePaymentMethodsService } from './expense-payment-methods.service.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';

@Module({
  imports: [CategoriesModule, PaymentMethodsModule],
  controllers: [
    ExpensesController,
    ExpenseAmountsController,
    ExpensePaymentMethodsController,
  ],
  providers: [
    ExpensesService,
    ExpenseAmountsService,
    ExpensePaymentMethodsService,
  ],
  exports: [ExpensesService],
})
export class ExpensesModule {}
