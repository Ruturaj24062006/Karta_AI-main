import api from './apiConfig';

export type ActivityLogItem = {
  timestamp: string;
  username: string;
  action: string;
  detail: string;
};

export type AdminUser = {
  id: number;
  username: string;
  role: 'admin' | 'analyst';
  is_active: boolean;
};

export async function fetchAdminLogs(): Promise<ActivityLogItem[]> {
  const { data } = await api.get<ActivityLogItem[]>('/admin/logs');
  return data;
}

export async function fetchSessionStats(): Promise<{ active_users: number }> {
  const { data } = await api.get<{ active_users: number }>('/admin/session-stats');
  return data;
}

export async function logoutCurrentUser(): Promise<void> {
  await api.post('/logout');
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/api/admin/users');
  return data;
}

export async function deleteAdminUser(username: string): Promise<void> {
  await api.delete(`/api/admin/users/${encodeURIComponent(username)}`);
}

export async function fetchSystemHealth(): Promise<{ status: string; version?: string }> {
  const { data } = await api.get<{ status: string; version?: string }>('/health');
  return data;
}
