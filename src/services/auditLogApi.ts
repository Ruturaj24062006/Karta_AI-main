import api from './apiConfig';

export interface AuditLog {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  resource_type: string;
  details: string;
  status: 'success' | 'failure';
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const response = await api.get<AuditLog[]>('/admin/audit-logs');
    return response.data || [];
  } catch (error) {
    throw error;
  }
}
