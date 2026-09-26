import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { applyFieldErrors, errorMessage, errorStatus } from '../../api/errors';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Field, Form, FormError, Input } from '../../components/ui/Field';
import { AuthFooter, AuthLayout } from './AuthLayout';

// As mesmas regras da API (validar nos dois lados: aqui é UX, lá é segurança).
const schema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome (mínimo 2 letras)').max(100),
    email: z.email('Informe um e-mail válido'),
    password: z
      .string()
      .min(8, 'A senha deve ter pelo menos 8 caracteres')
      .refine((value) => new TextEncoder().encode(value).length <= 72, 'A senha é longa demais'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setFormError(null);
    try {
      await registerAccount({ name, email, password });
      navigate('/', { replace: true });
    } catch (error) {
      if (errorStatus(error) === 409) {
        setError('email', { message: 'Este e-mail já está cadastrado' });
      } else if (!applyFieldErrors(error, setError, ['name', 'email', 'password'])) {
        setFormError(errorMessage(error));
      }
    }
  });

  return (
    <AuthLayout subtitle="Crie sua conta e cadastre seus gastos fixos">
      <Form onSubmit={onSubmit} noValidate>
        {formError && <FormError>{formError}</FormError>}
        <Field label="Nome" error={errors.name?.message}>
          {(a11y) => <Input {...a11y} autoComplete="name" {...register('name')} />}
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" {...register('email')} />}
        </Field>
        <Field label="Senha" error={errors.password?.message} hint="Mínimo de 8 caracteres">
          {(a11y) => (
            <Input
              {...a11y}
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
          )}
        </Field>
        <Field label="Confirmar senha" error={errors.confirmPassword?.message}>
          {(a11y) => (
            <Input
              {...a11y}
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          )}
        </Field>
        <Button type="submit" block loading={isSubmitting}>
          Criar conta
        </Button>
      </Form>
      <AuthFooter style={{ marginTop: 24 }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </AuthFooter>
    </AuthLayout>
  );
}
