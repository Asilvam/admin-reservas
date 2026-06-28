import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginAdmin } from '../services/adminApi';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo ?? '/reservas';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const token = await loginAdmin(password);
      localStorage.setItem('adminToken', token);
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="eyebrow">Acceso privado</p>
        <h1 id="login-title">Admin Reservas</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password">Clave de ingreso</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Ingresa la clave"
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isLoading || !password}>
            {isLoading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
        <p className="login-note">Demo local: usa la clave definida en `VITE_DEMO_ADMIN_PASSWORD`.</p>
      </section>
    </main>
  );
}
