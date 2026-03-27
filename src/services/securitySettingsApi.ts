import api from './apiConfig';

export interface SecuritySettings {
  password_expiry_days: number;
  session_timeout_minutes: number;
  failed_login_attempts: number;
  lockout_duration_minutes: number;
  enable_2fa: boolean;
  enforce_password_complexity: boolean;
  ip_whitelist_enabled: boolean;
}

export async function fetchSecuritySettings(): Promise<SecuritySettings> {
  try {
    const response = await api.get<SecuritySettings>('/admin/security-settings');
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function updateSecuritySettings(settings: SecuritySettings): Promise<SecuritySettings> {
  try {
    const response = await api.put<SecuritySettings>('/admin/security-settings', settings);
    return response.data;
  } catch (error) {
    throw error;
  }
}
