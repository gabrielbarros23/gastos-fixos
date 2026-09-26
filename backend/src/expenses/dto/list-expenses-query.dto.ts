import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export const EXPENSE_STATUS_FILTERS = ['active', 'inactive', 'all'] as const;
export type ExpenseStatusFilter = (typeof EXPENSE_STATUS_FILTERS)[number];

export class ListExpensesQueryDto {
  @ApiProperty({
    enum: EXPENSE_STATUS_FILTERS,
    required: false,
    default: 'all',
  })
  @IsOptional()
  @IsIn(EXPENSE_STATUS_FILTERS, {
    message: 'status deve ser active, inactive ou all',
  })
  status: ExpenseStatusFilter = 'all';

  @IsOptional()
  @IsUUID('all', { message: 'categoryId deve ser um UUID' })
  categoryId?: string;
}
