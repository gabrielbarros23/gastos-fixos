import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import {
  isRecordNotFound,
  isUniqueViolation,
} from '../../prisma/prisma-errors.js';

export interface ErrorDetail {
  field: string;
  message: string;
}

/** Formato único de erro da API. */
export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details?: ErrorDetail[];
  path: string;
  timestamp: string;
}

interface NormalizedError {
  statusCode: number;
  message: string;
  details?: ErrorDetail[];
}

/**
 * Converte qualquer exceção no mesmo formato de resposta. Erros inesperados
 * viram 500 com mensagem genérica: detalhes internos (stack, SQL) vão só para o log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, details } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      error: STATUS_CODES[statusCode] ?? 'Error',
      message,
      ...(details && { details }),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return { statusCode, message: body };
      }
      const { message, details } = body as {
        message?: string | string[];
        details?: ErrorDetail[];
      };
      return {
        statusCode,
        message: Array.isArray(message)
          ? message.join('; ')
          : (message ?? exception.message),
        details,
      };
    }

    // Rede de segurança: os services já tratam esses casos com mensagens
    // específicas, mas se algum escapar não vira um 500.
    if (isUniqueViolation(exception)) {
      return { statusCode: HttpStatus.CONFLICT, message: 'Registro duplicado' };
    }
    if (isRecordNotFound(exception)) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Registro não encontrado',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
    };
  }
}
