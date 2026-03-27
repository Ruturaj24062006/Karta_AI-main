import { Link, useLocation } from 'react-router-dom';
import { getUserRole } from '../services/auth';
import { Activity, Building2, History, Settings, ShieldCheck } from 'lucide-react';
import './RoleModeNav.css';

type RoleModeNavProps = {
  className?: string;
};

function navClass(pathname: string, currentPath: string): string {
  const isActive = currentPath === pathname;
  return `role-mode-link ${isActive ? 'active' : ''}`;
}

function RoleModeNav({ className }: RoleModeNavProps) {
  const role = getUserRole();
  const location = useLocation();

  if (!role) return null;

  if (role === 'admin') {
    return (
      <div className={`role-mode-nav ${className || ''}`.trim()}>
        <Link to="/upload" className={navClass('/upload', location.pathname)}>
          <Building2 size={15} />
          Operational View
        </Link>
        <Link to="/admin-dashboard" className={navClass('/admin-dashboard', location.pathname)}>
          <ShieldCheck size={15} />
          Admin Panel
        </Link>
        <Link to="/user-management" className={navClass('/user-management', location.pathname)}>
          <Settings size={15} />
          User Management
        </Link>
        <Link to="/company-history" className={navClass('/company-history', location.pathname)}>
          <History size={15} />
          Company History
        </Link>
      </div>
    );
  }

  return (
    <div className={`role-mode-nav ${className || ''}`.trim()}>
      <Link to="/upload" className={navClass('/upload', location.pathname)}>
        <Building2 size={15} />
        Upload
      </Link>
      <Link to="/reports" className={navClass('/reports', location.pathname)}>
        <Activity size={15} />
        CAM Reports
      </Link>
      <span className="role-mode-badge">
        Operational View
      </span>
    </div>
  );
}

export default RoleModeNav;
