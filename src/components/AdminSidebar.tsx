import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Building2, ShieldCheck, Users, History, BarChart3 } from 'lucide-react';
import { clearAuthSession } from '../services/auth';
import { logoutCurrentUser } from '../services/adminApi';
import './AdminSidebar.css';

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const menuItems = [
    { label: 'Operational View', path: '/upload', icon: Building2 },
    { label: 'Admin Panel', path: '/admin-dashboard', icon: ShieldCheck },
    { label: 'User Management', path: '/user-management', icon: Users },
    { label: 'Company History', path: '/company-history', icon: History },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <BarChart3 size={20} />
          <span>Admin</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
