import { type ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

type AdminLayoutProps = {
  children: ReactNode;
};

function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
