import { useState } from 'react';
import AdminDashboardLayout, { type AdminView } from '../components/AdminDashboardLayout';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminDashboardContent from './AdminDashboardContent';
import UserManagementContent from './UserManagementContent';
import CompanyHistoryContent from './CompanyHistoryContent';

function AdminPanel() {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  const getPageTitle = () => {
    switch (currentView) {
      case 'operational':
        return { title: 'Operational View', desc: 'Company upload and analysis' };
      case 'dashboard':
        return { title: 'Admin Dashboard', desc: 'System activity and monitoring' };
      case 'users':
        return { title: 'User Management', desc: 'Manage users and role assignments' };
      case 'company':
        return { title: 'Company History', desc: 'View past checks and monitoring status' };
      default:
        return { title: 'Admin', desc: '' };
    }
  };

  const { title, desc } = getPageTitle();

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminDashboardLayout currentView={currentView} setCurrentView={setCurrentView}>
        <div>
          <AdminPageHeader title={title} description={desc} />

          {/* Content Sections */}
          {currentView === 'operational' && (
            <div className="admin-view-section">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Operational View</h2>
                <p className="text-slate-600">
                  Upload company details and financial documents to begin credit analysis.
                </p>
                <a href="/upload" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Go to Upload
                </a>
              </div>
            </div>
          )}

          {currentView === 'dashboard' && <AdminDashboardContent />}
          {currentView === 'users' && <UserManagementContent />}
          {currentView === 'company' && <CompanyHistoryContent />}
        </div>
      </AdminDashboardLayout>
    </div>
  );
}

export default AdminPanel;
