import { Outlet, Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/dashboard/upload': 'Upload CSV',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/export': 'Export',
};

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/" />;

  const title = pageTitles[location.pathname] || 'Dashboard';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-content">
        <header className="top-bar">
          <h1 className="top-title">{title}</h1>
          <div className="top-right">
            <div className="top-date">
              <span className="date-icon">📅</span>
              {dateStr}
            </div>
            <div className="top-badge">SMATICS</div>
          </div>
        </header>
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
