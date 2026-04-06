import { NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sb-icon">⚡</span>
        <span className="sb-name">EnergyTrack</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span>📊</span> Dashboard
        </NavLink>
        <NavLink to="/dashboard/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span>📁</span> Upload CSV
        </NavLink>
        <NavLink to="/dashboard/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span>📈</span> Analytics
        </NavLink>
        <NavLink to="/dashboard/export" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span>💾</span> Export
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <span className="user-name">{user?.username}</span>
        </div>
        <button className="btn-logout" onClick={logout}>Logout</button>
      </div>
    </aside>
  );
}
