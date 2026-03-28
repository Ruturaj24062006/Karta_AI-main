import { BrowserRouter as Router, Navigate, Routes, Route, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import NewAnalysis from './pages/NewAnalysis';
import Analysis from './pages/Analysis';
import Dashboard from './pages/Dashboard';
import FraudReport from './pages/FraudReport';
import WarningSystem from './pages/WarningSystem';
import CamSuccess from './pages/CamSuccess';
import History from './pages/History';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import Unauthorized from './pages/Unauthorized';
import UserManagement from './pages/UserManagement';
import CompanyHistory from './pages/CompanyHistory';
import Analytics from './pages/Analytics';
import ProtectedRoute from './components/ProtectedRoute';
import UniversalSidebar from './components/UniversalSidebar';

function ProtectedLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <UniversalSidebar />
      <main style={{ flex: 1, marginLeft: '280px', width: 'calc(100% - 280px)', minHeight: '100vh', background: '#f1f5f9', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
  
/* 
  All inter-page navigation uses URL query params to carry the analysis ID:
  /analysis?id=2
  /dashboard?id=2
  /fraud-report?id=2
  /cam-success?id=2
  /warning-system?company_id=1&id=2
*/
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Analyst Routes with Sidebar */}
        <Route element={<ProtectedRoute allowedRoles={['analyst']} />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/upload" element={<NewAnalysis />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports" element={<Analytics />} />
          </Route>
        </Route>

        {/* Admin Routes with Sidebar */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/company-history" element={<CompanyHistory />} />
            <Route path="/system-logs" element={<Navigate to="/admin-dashboard" replace />} />
            <Route path="/new-analysis" element={<NewAnalysis />} />
            <Route path="/history" element={<History />} />
            <Route path="/reports" element={<FraudReport />} />
            <Route path="/fraud-report" element={<FraudReport />} />
            <Route path="/warning-system" element={<WarningSystem />} />
            <Route path="/cam-success" element={<CamSuccess />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
