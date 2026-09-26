import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

const WITH_EXPENSE_COUNT = { _count: { select: { expenses: true } } } as const;

function duplicateName(): ConflictException {
  return new ConflictException('Já existe uma categoria com esse nome');
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      include: WITH_EXPENSE_COUNT,
      orderBy: { name: 'asc' },
    });
    return categories.map((category) => CategoryResponseDto.from(category));
  }

  async create(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    try {
      const category = await this.prisma.category.create({
        data: { ...dto, userId },
        include: WITH_EXPENSE_COUNT,
      });
      return CategoryResponseDto.from(category);
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicateName();
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    await this.assertOwned(userId, id);
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: dto,
        include: WITH_EXPENSE_COUNT,
      });
      return CategoryResponseDto.from(category);
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicateName();
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwned(userId, id);
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      // Quem garante a regra é a FK com RESTRICT, não um "count antes de
      // apagar": entre o count e o delete outro request poderia criar um gasto.
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Esta categoria tem gastos vinculados. Mova-os para outra categoria antes de excluir.',
        );
      }
      throw error;
    }
  }

  /**
   * Garante que a categoria existe E pertence ao usuário. Categoria de outro
   * usuário responde 404 (e não 403), para não revelar que o ID existe.
   */
  async assertOwned(userId: string, id: string): Promise<void> {
    const exists = await this.prisma.category.count({ where: { id, userId } });
    if (!exists) {
      throw new NotFoundException('Categoria não encontrada');
    }
  }
}
