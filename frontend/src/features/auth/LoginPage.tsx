import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import styled from 'styled-components';
import { z } from 'zod';
import { errorMessage } from '../../api/errors';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Field, Form, FormError, Input } from '../../components/ui/Field';
import { AuthFooter, AuthLayout } from './AuthLayout';

const schema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

type LoginForm = z.infer<typeof schema>;

const DEMO = { email: 'demo@gastos.dev', password: 'demo12345' };

const DemoHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <AuthLayout subtitle="Entre para ver o calendário dos seus gastos">
      <Form onSubmit={onSubmit} noValidate>
        {formError && <FormError>{formError}</FormError>}
        <Field label="E-mail" error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" {...register('email')} />}
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          {(a11y) => (
            <Input
              {...a11y}
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
          )}
        </Field>
        <Button type="submit" block loading={isSubmitting}>
          Entrar
        </Button>
        <DemoHint>
          <span>Só quer conhecer? Use a conta demo.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setValue('email', DEMO.email);
              setValue('password', DEMO.password);
            }}
          >
            Preencher
          </Button>
        </DemoHint>
      </Form>
      <AuthFooter style={{ marginTop: 24 }}>
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </AuthFooter>
    </AuthLayout>
  );
}
