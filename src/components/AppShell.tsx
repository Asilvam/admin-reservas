import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export function AppShell() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Reservas</h1>
        </div>
        <nav className="nav-links" aria-label="Navegacion admin">
          <NavLink to="/reservas">Reservas</NavLink>
        </nav>
        <button className="ghost-button" type="button" onClick={logout}>
          Salir
        </button>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
