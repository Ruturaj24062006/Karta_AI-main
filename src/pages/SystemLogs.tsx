import { useEffect, useState } from 'react';
import { fetchAdminLogs, fetchSessionStats, fetchSystemHealth, type ActivityLogItem } from '../services/adminApi';

function SystemLogs() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [health, setHealth] = useState<{ status: string; version?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    try {
      const [logData, sessionData, healthData] = await Promise.all([
        fetchAdminLogs(),
        fetchSessionStats(),
        fetchSystemHealth(),
      ]);
      setLogs(logData);
      setActiveUsers(sessionData.active_users);
      setHealth(healthData);
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Failed to load system logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white border border-slate-200 shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-black text-slate-900">System Logs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Admin-only page for security and application event logs.
        </p>

        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Active Users</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{activeUsers}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs text-slate-500">API Health</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{health?.status || '--'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Version</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{health?.version || '--'}</div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Activity Feed</h2>
            <button
              onClick={loadData}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-slate-500">Loading logs...</div>
          ) : error ? (
            <div className="p-4 text-sm text-rose-700 bg-rose-50 border-t border-rose-200">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No log events available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 100).map((log, idx) => (
                    <tr key={`${log.timestamp}-${idx}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{log.username}</td>
                      <td className="px-4 py-3 uppercase text-xs tracking-wide text-slate-500">{log.action}</td>
                      <td className="px-4 py-3 text-slate-700">{log.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemLogs;
