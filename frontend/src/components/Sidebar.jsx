import { NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* User Profile */}
      <div className="sidebar-profile">
        <div className="profile-avatar">{user?.username?.[0]?.toUpperCase()}</div>
        <div className="profile-info">
          <span className="profile-name">{user?.username}</span>
          <span className="profile-email">{user?.email || 'user@smatics.com'}</span>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search" readOnly />
      </div>

      {/* Main Menu */}
      <div className="nav-group">
        <span className="nav-group-label">Main Menu</span>
        <NavLink to="/dashboard" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span> Dashboard
        </NavLink>
        <NavLink to="/dashboard/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📁</span> Upload CSV
        </NavLink>
      </div>

      {/* Records */}
      <div className="nav-group">
        <span className="nav-group-label">Records</span>
        <NavLink to="/dashboard/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📈</span> Analytics
        </NavLink>
        <NavLink to="/dashboard/export" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">💾</span> Export
        </NavLink>
      </div>

      <div className="sidebar-spacer"></div>

      <button className="btn-logout" onClick={logout}>
        <span>🚪</span> Logout
      </button>
    </aside>
  );
}
