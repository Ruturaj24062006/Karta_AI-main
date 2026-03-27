const TOKEN_KEY = 'karta_auth_token';
const ROLE_KEY = 'karta_user_role';
const USERNAME_KEY = 'karta_username';

export type UserRole = 'analyst' | 'admin';

export function setAuthSession(token: string, role: UserRole, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(USERNAME_KEY, username);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserRole(): UserRole | null {
  const role = localStorage.getItem(ROLE_KEY);
  if (role === 'admin' || role === 'analyst') return role;
  return null;
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
}
