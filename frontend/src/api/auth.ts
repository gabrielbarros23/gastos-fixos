import { api, setAccessToken } from './client';
import type { AuthResponse, User } from './types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input);
  setAccessToken(data.accessToken);
  return data;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', input);
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export interface UpdateMeInput {
  name?: string;
  remindersEnabled?: boolean;
  reminderDaysBefore?: number;
}

export async function updateMe(input: UpdateMeInput): Promise<User> {
  const { data } = await api.patch<User>('/users/me', input);
  return data;
}
