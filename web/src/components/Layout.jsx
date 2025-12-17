import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">₿</div>
          <span>Ledger App</span>
        </div>

        <ul className="sidebar-nav">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/accounts" className={({ isActive }) => isActive ? 'active' : ''}>
              Accounts
            </NavLink>
          </li>
          <li>
            <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : ''}>
              Transactions
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
              Reports
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="sidebar-user-email">
              {user?.email}
            </div>
          </div>
          <button className="btn btn-secondary btn-block" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
