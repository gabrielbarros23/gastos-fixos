import type { Category } from '../../generated/prisma/client.js';

export class CategoryResponseDto {
  id: string;
  name: string;
  /** @example "#EC4899" */
  color: string;
  /** Quantos gastos usam esta categoria */
  expenseCount: number;

  static from(
    category: Category & { _count: { expenses: number } },
  ): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      expenseCount: category._count.expenses,
    };
  }
}
