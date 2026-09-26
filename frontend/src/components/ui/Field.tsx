import { useId, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.colors.text};
`;

const Hint = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.danger};
`;

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** Recebe o id e os atributos de acessibilidade para o controle. */
  children: (control: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/** Label + controle + dica/erro, com os atributos de acessibilidade ligados. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <Wrapper>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error || hint ? messageId : undefined,
      })}
      {error ? (
        <ErrorText id={messageId} role="alert">
          {error}
        </ErrorText>
      ) : (
        hint && <Hint id={messageId}>{hint}</Hint>
      )}
    </Wrapper>
  );
}

const controlStyles = css`
  width: 100%;
  min-height: 42px;
  padding: 0 ${({ theme }) => theme.space[3]};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.font.size.md};
  transition:
    border-color ${({ theme }) => theme.transition},
    box-shadow ${({ theme }) => theme.transition};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSubtle};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focus};
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.danger};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

export const Input = styled.input`
  ${controlStyles}
`;

export const Select = styled.select`
  ${controlStyles}
  padding-right: ${({ theme }) => theme.space[2]};
`;

export const Textarea = styled.textarea`
  ${controlStyles}
  min-height: 80px;
  padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[3]};
  resize: vertical;
`;

/** Linha de campos lado a lado que empilha no celular. */
export const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.space[3]};
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

/** Erro geral do formulário (ex.: "E-mail ou senha inválidos"). */
export const FormError = styled.div.attrs({ role: 'alert' })`
  padding: ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.dangerSoft};
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.font.size.sm};
`;
