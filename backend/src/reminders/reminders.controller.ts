import {
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/auth/auth-user.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { NodeEnv, type Env } from '../config/env.validation.js';
import { UsersService } from '../users/users.service.js';
import { RunRemindersResponseDto } from './dto/run-reminders-response.dto.js';
import { ReminderScannerService } from './reminder-scanner.service.js';

@ApiTags('reminders')
@ApiBearerAuth()
@Controller('reminders')
export class RemindersController {
  constructor(
    private readonly scanner: ReminderScannerService,
    private readonly users: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * (Só fora de produção) Roda agora a varredura de lembretes do usuário logado,
   * sem esperar o horário agendado. Útil para demonstrar/testar com o Mailpit.
   * Seguro de chamar várias vezes: lembrete já enviado não é reenviado.
   */
  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED) // os e-mails saem de forma assíncrona, pela fila
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async run(
    @CurrentUser() current: AuthUser,
  ): Promise<RunRemindersResponseDto> {
    if (this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Production) {
      throw new NotFoundException();
    }
    const user = await this.users.getById(current.id);
    if (!user.remindersEnabled) return { queued: 0 };
    return { queued: await this.scanner.scanUser(user) };
  }
}
