import styled from 'styled-components';

const Group = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  max-width: 100%;
  overflow-x: auto;
`;

const Option = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 6px ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  white-space: nowrap;
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadow.sm : 'none')};
  transition: background ${({ theme }) => theme.transition};
`;

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Grupo de botões mutuamente exclusivos (filtros, preferências). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <Group role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <Option
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          $active={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Option>
      ))}
    </Group>
  );
}
