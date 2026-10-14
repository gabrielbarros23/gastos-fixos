import { Check } from 'lucide-react';
import styled from 'styled-components';
import { PALETTE } from '../../lib/palette';

const Swatches = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
`;

const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid ${({ theme, $selected }) => ($selected ? theme.colors.text : 'transparent')};
  background: ${({ $color }) => $color};
  color: #fff;
`;

const CustomColor = styled.input`
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: 50%;
  background: none;
  cursor: pointer;

  &::-webkit-color-swatch-wrapper {
    padding: 3px;
  }
  &::-webkit-color-swatch {
    border: none;
    border-radius: 50%;
  }
`;

interface ColorPickerProps {
  id?: string;
  /** Rótulo acessível do grupo (ex.: "Cor da categoria"). */
  label: string;
  value: string;
  onChange: (color: string) => void;
}

/** Paleta de cores pronta + uma cor livre. Valores sempre em "#RRGGBB" maiúsculo. */
export function ColorPicker({ id, label, value, onChange }: ColorPickerProps) {
  return (
    <Swatches id={id} role="radiogroup" aria-label={label}>
      {PALETTE.map((color) => {
        const selected = value.toUpperCase() === color;
        return (
          <Swatch
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            $color={color}
            $selected={selected}
            onClick={() => onChange(color)}
          >
            {selected && <Check size={16} strokeWidth={3} />}
          </Swatch>
        );
      })}
      <CustomColor
        type="color"
        aria-label="Outra cor"
        title="Outra cor"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
    </Swatches>
  );
}
