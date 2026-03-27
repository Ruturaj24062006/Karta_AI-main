import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Building2, ShieldCheck, Users, History, Activity, Zap } from 'lucide-react';
import { clearAuthSession, getUserRole } from '../services/auth';
import { logoutCurrentUser } from '../services/adminApi';
import './UniversalSidebar.css';

function UniversalSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getUserRole();

  const handleLogout = async () => {
    try {
      await logoutCurrentUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuthSession();
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Admin menu items
  const adminMenuItems = [
    { label: 'Operational View', path: '/upload', icon: Building2 },
    { label: 'Admin Panel', path: '/admin-dashboard', icon: ShieldCheck },
    { label: 'User Management', path: '/user-management', icon: Users },
    { label: 'Company History', path: '/company-history', icon: History },
  ];

  // Analyst menu items
  const analystMenuItems = [
    { label: 'Upload', path: '/upload', icon: Building2 },
    { label: 'Analytics', path: '/reports', icon: Activity },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : analystMenuItems;

  return (
    <aside className="universal-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Zap size={24} />
          <span>KARTA</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            title={item.label}
          >
            <item.icon size={20} />
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn" title="Logout">
          <LogOut size={20} />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default UniversalSidebar;
