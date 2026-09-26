import { LogOut } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { updateMe, type UpdateMeInput } from '../../api/auth';
import { errorMessage } from '../../api/errors';
import { useAuth, useCurrentUser } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/Toast';
import { useThemeMode, type ThemePreference } from '../../styles/ThemeModeProvider';

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  max-width: 640px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};

  p {
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.textMuted};
  }

  & + & {
    margin-top: ${({ theme }) => theme.space[4]};
    padding-top: ${({ theme }) => theme.space[4]};
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const NameForm = styled.form`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space[3]};

  > div {
    flex: 1;
  }
`;

const DAY_OPTIONS = Array.from({ length: 31 }, (_, days) => days);

function daysLabel(days: number): string {
  if (days === 0) return 'No dia do vencimento';
  if (days === 1) return '1 dia antes';
  return `${days} dias antes`;
}

export function SettingsPage() {
  const user = useCurrentUser();
  const { setUser, logout } = useAuth();
  const { preference, setPreference } = useThemeMode();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState<keyof UpdateMeInput | null>(null);

  const save = async (input: UpdateMeInput, message: string) => {
    setSaving(Object.keys(input)[0] as keyof UpdateMeInput);
    try {
      setUser(await updateMe(input));
      toast.success(message);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Lembretes, aparência e conta." />
      <Stack>
        <Card>
          <CardTitle>Lembretes por e-mail</CardTitle>
          <Row>
            <div>
              <strong>Avisar antes dos vencimentos</strong>
              <p>Um e-mail para cada conta que vai vencer, enviado para {user.email}.</p>
            </div>
            <Switch
              label="Lembretes por e-mail"
              checked={user.remindersEnabled}
              disabled={saving !== null}
              onChange={(remindersEnabled) =>
                save(
                  { remindersEnabled },
                  remindersEnabled ? 'Lembretes ativados' : 'Lembretes desativados',
                )
              }
            />
          </Row>
          <Row>
            <div>
              <strong>Quando avisar</strong>
              <p>Com quantos dias de antecedência.</p>
            </div>
            <Select
              aria-label="Quando avisar"
              style={{ width: 'auto' }}
              value={user.reminderDaysBefore}
              disabled={!user.remindersEnabled || saving !== null}
              onChange={(event) =>
                save({ reminderDaysBefore: Number(event.target.value) }, 'Antecedência atualizada')
              }
            >
              {DAY_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {daysLabel(days)}
                </option>
              ))}
            </Select>
          </Row>
        </Card>

        <Card>
          <CardTitle>Aparência</CardTitle>
          <Segmented<ThemePreference>
            label="Tema"
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'system', label: 'Automático' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
            ]}
          />
        </Card>

        <Card>
          <CardTitle>Conta</CardTitle>
          <NameForm
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim().length >= 2) void save({ name: name.trim() }, 'Nome atualizado');
            }}
          >
            <Field label="Nome">
              {(a11y) => (
                <Input {...a11y} value={name} onChange={(event) => setName(event.target.value)} />
              )}
            </Field>
            <Button
              type="submit"
              variant="secondary"
              loading={saving === 'name'}
              disabled={name.trim() === user.name || name.trim().length < 2}
            >
              Salvar
            </Button>
          </NameForm>
          <Row style={{ marginTop: 16 }}>
            <p>Conectado como {user.email}</p>
            <Button variant="ghost" icon={<LogOut size={18} />} onClick={() => void logout()}>
              Sair
            </Button>
          </Row>
        </Card>
      </Stack>
    </>
  );
}
