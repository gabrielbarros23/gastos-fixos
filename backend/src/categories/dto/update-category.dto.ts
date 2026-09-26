import { IsString, Length, Matches } from 'class-validator';
import { IsOptionalNotNull } from '../../common/validation/is-optional-not-null.decorator.js';
import { Trim } from '../../common/validation/transformers.js';
import { HEX_COLOR, NormalizeColor } from './create-category.dto.js';

export class UpdateCategoryDto {
  /** @example "Streaming" */
  @IsOptionalNotNull()
  @Trim()
  @IsString()
  @Length(1, 50, { message: 'O nome deve ter entre 1 e 50 caracteres' })
  name?: string;

  /** @example "#EC4899" */
  @IsOptionalNotNull()
  @NormalizeColor()
  @IsString()
  @Matches(HEX_COLOR, { message: 'A cor deve estar no formato #RRGGBB' })
  color?: string;
}
