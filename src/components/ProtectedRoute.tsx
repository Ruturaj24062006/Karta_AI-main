import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAuthToken, getUserRole, type UserRole } from '../services/auth';

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
};

function hasAccess(role: UserRole, allowedRoles?: UserRole[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (allowedRoles.includes(role)) return true;

  // Hierarchy: admin can access all analyst-level routes.
  if (role === 'admin' && allowedRoles.includes('analyst')) return true;
  return false;
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getAuthToken();
  const role = getUserRole();

  if (!token || !role) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasAccess(role, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
