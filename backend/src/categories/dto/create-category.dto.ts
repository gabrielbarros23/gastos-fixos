import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';
import { Trim } from '../../common/validation/transformers.js';

export const HEX_COLOR = /^#[0-9A-F]{6}$/;

/** Cor em maiúsculas, para "#ec4899" e "#EC4899" serem a mesma cor. */
export const NormalizeColor = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

export class CreateCategoryDto {
  /** @example "Streaming" */
  @Trim()
  @IsString()
  @Length(1, 50, { message: 'O nome deve ter entre 1 e 50 caracteres' })
  name: string;

  /** Cor em hexadecimal. @example "#EC4899" */
  @NormalizeColor()
  @IsString()
  @Matches(HEX_COLOR, { message: 'A cor deve estar no formato #RRGGBB' })
  color: string;
}
