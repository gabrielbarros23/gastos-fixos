import styled from 'styled-components';

const Track = styled.button<{ $on: boolean }>`
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  border: none;
  border-radius: 999px;
  background: ${({ theme, $on }) => ($on ? theme.colors.primary : theme.colors.borderStrong)};
  transition: background ${({ theme }) => theme.transition};

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${({ $on }) => ($on ? '21px' : '3px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: left ${({ theme }) => theme.transition};
  }

  &:disabled {
    opacity: 0.5;
  }
`;

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <Track
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      $on={checked}
      onClick={() => onChange(!checked)}
    />
  );
}
