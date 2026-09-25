import { ValidateBy, ValidationOptions } from 'class-validator';

/**
 * Limita o tamanho em bytes (UTF-8), não em caracteres. Existe por causa do
 * bcrypt, que ignora tudo depois do 72º byte: sem esse limite, duas senhas
 * longas com o mesmo começo teriam o mesmo hash. Com acentos ou emojis,
 * 72 caracteres podem passar de 72 bytes, por isso @MaxLength não basta.
 */
export function MaxBytes(max: number, options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'maxBytes',
      constraints: [max],
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
        defaultMessage: () => `deve ter no máximo ${max} bytes`,
      },
    },
    options,
  );
}
