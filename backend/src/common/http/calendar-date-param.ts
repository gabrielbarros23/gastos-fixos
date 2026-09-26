import {
  BadRequestException,
  Injectable,
  Param,
  type PipeTransform,
} from '@nestjs/common';
import {
  parseCalendarDate,
  isValidCalendarDate,
  type CalendarDate,
} from '../../domain/calendar-date.js';

@Injectable()
class ParseCalendarDatePipe implements PipeTransform<string, CalendarDate> {
  constructor(private readonly name: string) {}

  transform(value: string): CalendarDate {
    if (!isValidCalendarDate(value)) {
      throw new BadRequestException(
        `O parâmetro "${this.name}" deve ser uma data válida no formato AAAA-MM-DD`,
      );
    }
    return parseCalendarDate(value);
  }
}

/** `@CalendarDateParam('dueDate')`: parâmetro de rota `YYYY-MM-DD`, já validado. */
export const CalendarDateParam = (name: string) =>
  Param(name, new ParseCalendarDatePipe(name));
