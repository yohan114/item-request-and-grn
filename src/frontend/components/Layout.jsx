import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/mrns/new')) return 'New MRN';
    if (path.match(/\/mrns\/[^/]+\/edit/)) return 'Edit MRN';
    if (path.match(/\/mrns\/[^/]+/)) return 'MRN Details';
    if (path.includes('/mrns')) return 'Material Receipt Notes';
    if (path.includes('/grns/new')) return 'New GRN';
    if (path.match(/\/grns\/[^/]+\/edit/)) return 'Edit GRN';
    if (path.match(/\/grns\/[^/]+/)) return 'GRN Details';
    if (path.includes('/grns')) return 'Goods Received Notes';
    if (path.includes('/received-items/new')) return 'New Received Item';
    if (path.match(/\/received-items\/[^/]+\/edit/)) return 'Edit Received Item';
    if (path.match(/\/received-items\/[^/]+/)) return 'Received Item Details';
    if (path.includes('/received-items')) return 'Received Items';
    if (path.includes('/local-purchases/new')) return 'New Local Purchase';
    if (path.includes('/edit')) return 'Edit Local Purchase';
    if (path.includes('/local-purchases/')) return 'Local Purchase Details';
    if (path.includes('/local-purchases')) return 'Local Purchases';
    if (path.includes('/users')) return 'User Management';
    if (path.includes('/reports')) return 'Reports';
    if (path.includes('/audit-logs')) return 'Audit Logs';
    return 'Dashboard';
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '\u2302', roles: null },
    { path: '/mrns', label: 'MRN', icon: '\u2709', roles: null },
    { path: '/grns', label: 'GRN', icon: '\u2611', roles: null },
    { path: '/received-items', label: 'Received Items', icon: '\u2610', roles: null },
    { path: '/local-purchases', label: 'Local Purchases', icon: '\u2630', roles: null },
    { path: '/reports', label: 'Reports', icon: '\u2691', roles: ['Admin', 'Manager'] },
    { path: '/audit-logs', label: 'Audit Logs', icon: '\u2699', roles: ['Admin', 'Manager'] },
    { path: '/users', label: 'Users', icon: '\u263A', roles: ['Admin'] }
  ];

  const visibleItems = navItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>LP Management</h2>
          <div className="subtitle">Purchase & GRN System</div>
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-area">
        <header className="header">
          <div className="header-left">
            <h1>{getPageTitle()}</h1>
          </div>
          <div className="header-right">
            <span className="header-user">
              <strong>{user?.full_name || user?.username}</strong> ({user?.role})
            </span>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
