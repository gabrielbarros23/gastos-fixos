import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_CATEGORIES } from '../categories/default-categories.js';
import type { User } from '../generated/prisma/client.js';
import { isUniqueViolation } from '../prisma/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateMeDto } from './dto/update-me.dto.js';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<User> {
    try {
      // Escrita aninhada: usuário e categorias padrão entram na mesma
      // transação. Ou nasce tudo, ou nada (não existe usuário sem categorias).
      return await this.prisma.user.create({
        data: { ...data, categories: { create: [...DEFAULT_CATEGORIES] } },
      });
    } catch (error) {
      // Confia na unique constraint em vez de consultar antes e inserir depois:
      // o "consulta e insere" tem condição de corrida entre dois cadastros simultâneos.
      if (isUniqueViolation(error)) {
        throw new ConflictException('Este e-mail já está cadastrado');
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async getById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async update(id: string, data: UpdateMeDto): Promise<User> {
    await this.getById(id);
    return this.prisma.user.update({ where: { id }, data });
  }
}
