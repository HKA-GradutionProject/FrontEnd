export type AuthUser = {
  id: number;
  name: string;
  role: 'admin' | 'operation' | 'security';
  department: string | null;
};

export const AUTH_USER_STORAGE_KEY = 'smart-rfid-auth-user';

function parseAuthUser(value: string | null): AuthUser | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AuthUser>;

    if (typeof parsed.id !== 'number' || !parsed.name || !parsed.role) {
      return null;
    }

    return parsed as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredAuthUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    parseAuthUser(window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY)) ||
    parseAuthUser(window.localStorage.getItem(AUTH_USER_STORAGE_KEY))
  );
}

export function storeAuthUser(user: AuthUser, remember: boolean) {
  const serializedUser = JSON.stringify(user);

  if (remember) {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, serializedUser);
    window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(AUTH_USER_STORAGE_KEY, serializedUser);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}
