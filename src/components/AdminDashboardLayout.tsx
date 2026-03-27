import { useState } from 'react';
import { Building2, ShieldCheck, Users, History, LogOut } from 'lucide-react';
import { clearAuthSession } from '../services/auth';
import { logoutCurrentUser } from '../services/adminApi';
import { useNavigate } from 'react-router-dom';
import './AdminDashboardLayout.css';

export type AdminView = 'operational' | 'dashboard' | 'users' | 'company';

type AdminDashboardLayoutProps = {
  currentView: AdminView;
  setCurrentView: (view: AdminView) => void;
  children: React.ReactNode;
};

function AdminDashboardLayout({ currentView, setCurrentView, children }: AdminDashboardLayoutProps) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  const menuItems = [
    { id: 'operational', label: 'Operational View', icon: Building2 },
    { id: 'dashboard', label: 'Admin Panel', icon: ShieldCheck },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'company', label: 'Company History', icon: History },
  ];

  return (
    <div className="admin-dashboard-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin</h2>
          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle sidebar"
          >
            ☰
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as AdminView)}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}

export default AdminDashboardLayout;
