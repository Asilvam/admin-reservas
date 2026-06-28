import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function AppShell() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const logout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login', { replace: true });
  };

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={isSidebarCollapsed ? 'Abrir menu lateral' : 'Recoger menu lateral'}
          aria-expanded={!isSidebarCollapsed}
          onClick={() => setIsSidebarCollapsed((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="sidebar-brand">
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
