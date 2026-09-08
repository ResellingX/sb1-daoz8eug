import { useState } from 'react';
import { LoaderCircle, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const err = await signIn(email.trim(), password);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img
          className="login-logo"
          src="/Screenshot_20260907_081650_ResellingX.jpg"
          alt="ResellingX"
        />
        <p className="login-subtitle">Tu espacio para vender mejor</p>

        <h2 className="login-heading">Iniciar Sesión</h2>

        <form className="login-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="login-submit" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={18} /> : <><LogIn size={18} /> Entrar</>}
          </button>
        </form>
      </div>
    </div>
  );
}
