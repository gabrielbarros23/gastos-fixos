import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from './types';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * O access token fica só em memória (uma variável do módulo), nunca em
 * localStorage: um script injetado (XSS) não consegue lê-lo de lá. Ao
 * recarregar a página ele some, e a sessão é restaurada pelo refresh token,
 * que está num cookie httpOnly.
 */
let accessToken: string | null = null;
let onSessionExpired: () => void = () => {};

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshInFlight: Promise<AuthResponse> | null = null;

/**
 * Renova a sessão usando o cookie de refresh. "Single-flight": se várias
 * requisições receberem 401 ao mesmo tempo (ou o StrictMode montar o app duas
 * vezes), todas esperam o MESMO refresh. Sem isso, o segundo refresh usaria um
 * token que o primeiro acabou de rotacionar, e o backend entenderia como roubo
 * de token e derrubaria a sessão.
 */
export function refreshSession(): Promise<AuthResponse> {
  refreshInFlight ??= axios
    .post<AuthResponse>(`${baseURL}/auth/refresh`, null, { withCredentials: true })
    .then((response) => {
      accessToken = response.data.accessToken;
      return response.data;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Access token expirado (15 min): renova e repete a requisição original uma vez.
api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as RetriableConfig | undefined;
  const isAuthRoute = original?.url?.startsWith('/auth/');
  if (error.response?.status !== 401 || !original || original._retried || isAuthRoute) {
    throw error;
  }

  original._retried = true;
  try {
    await refreshSession();
  } catch {
    accessToken = null;
    onSessionExpired();
    throw error;
  }
  return api(original);
});
