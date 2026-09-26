import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { ExpenseAmountsController } from './expense-amounts.controller.js';
import { ExpenseAmountsService } from './expense-amounts.service.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';

@Module({
  imports: [CategoriesModule],
  controllers: [ExpensesController, ExpenseAmountsController],
  providers: [ExpensesService, ExpenseAmountsService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
