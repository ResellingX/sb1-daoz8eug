import { createContext, useContext, useState, type ReactNode } from 'react';

type UserRole = 'admin' | 'user';

interface AuthState {
  session: { email: string } | null;
  user: { email: string; id: string } | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'resellingx-auth';

function readStored(): { email: string; role: UserRole } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(email: string, role: UserRole) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, role }));
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY);
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [email, setEmail] = useState<string | null>(stored?.email ?? null);
  const [role, setRole] = useState<UserRole>(stored?.role ?? 'user');

  const session = email ? { email } : null;
  const user = email ? { email, id: email } : null;

  const signIn = async (inputEmail: string, password: string): Promise<string | null> => {
    const trimmed = inputEmail.trim().toLowerCase();
    if (!trimmed || password.length < 6) {
      return 'Introduce un email y contraseña válidos';
    }

    if (trimmed === 'luneiro@vinted.es' && password === '12345678') {
      setEmail(trimmed);
      setRole('admin');
      writeStored(trimmed, 'admin');
      return null;
    }

    if (trimmed === 'luneiro@vinted.es') {
      return 'Contraseña incorrecta';
    }

    setEmail(trimmed);
    setRole('user');
    writeStored(trimmed, 'user');
    return null;
  };

  const handleSignOut = async () => {
    setEmail(null);
    setRole('user');
    clearStored();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      role,
      loading: false,
      signIn,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
