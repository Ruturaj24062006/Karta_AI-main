import { useEffect, useState } from 'react';
import { fetchSecuritySettings, updateSecuritySettings, type SecuritySettings } from '../services/securitySettingsApi.ts';

function SecuritySettingsContent() {
  const [settings, setSettings] = useState<SecuritySettings>({
    password_expiry_days: 90,
    session_timeout_minutes: 30,
    failed_login_attempts: 5,
    lockout_duration_minutes: 15,
    enable_2fa: false,
    enforce_password_complexity: true,
    ip_whitelist_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [changed, setChanged] = useState(false);

  const loadSettings = async () => {
    setError('');
    setSuccess('');
    try {
      const data = await fetchSecuritySettings();
      setSettings(data);
      setChanged(false);
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Failed to load security settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const onSave = async () => {
    setError('');
    setSuccess('');
    try {
      await updateSecuritySettings(settings);
      setSuccess('Security settings updated successfully.');
      setChanged(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Failed to save security settings.');
    }
  };

  const handleChange = (key: keyof SecuritySettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setChanged(true);
  };

  return (
    <div className="admin-view-section">
      {loading ? (
        <div className="p-6 text-center text-slate-600">Loading security settings...</div>
      ) : (
        <div className="space-y-6">
          {error && <div className="p-4 text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{error}</div>}
          {success && <div className="p-4 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">{success}</div>}

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Password Policy</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password Expiry (days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.password_expiry_days}
                  onChange={(e) => handleChange('password_expiry_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Enforce Password Complexity</label>
                  <p className="text-xs text-slate-600 mt-1">Require uppercase, lowercase, numbers, and symbols</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enforce_password_complexity}
                  onChange={(e) => handleChange('enforce_password_complexity', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Session Settings</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.session_timeout_minutes}
                  onChange={(e) => handleChange('session_timeout_minutes', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Login Security</h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Failed Login Attempts Before Lockout</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.failed_login_attempts}
                  onChange={(e) => handleChange('failed_login_attempts', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Account Lockout Duration (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.lockout_duration_minutes}
                  onChange={(e) => handleChange('lockout_duration_minutes', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Enable Two-Factor Authentication</label>
                  <p className="text-xs text-slate-600 mt-1">Require 2FA for all users</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enable_2fa}
                  onChange={(e) => handleChange('enable_2fa', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300"
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div>
                  <label className="text-sm font-semibold text-slate-700">IP Whitelist</label>
                  <p className="text-xs text-slate-600 mt-1">Restrict access to whitelisted IP addresses</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ip_whitelist_enabled}
                  onChange={(e) => handleChange('ip_whitelist_enabled', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSave}
              disabled={!changed}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Save Settings
            </button>
            <button onClick={loadSettings} className="px-6 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecuritySettingsContent;
