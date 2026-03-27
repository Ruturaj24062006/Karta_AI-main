import { useEffect, useMemo, useState } from 'react';
import { getUsername } from '../services/auth';
import { fetchAdminLogs, fetchSessionStats, type ActivityLogItem } from '../services/adminApi';
import AdminPageHeader from '../components/AdminPageHeader';

function AdminDashboard() {
  const username = useMemo(() => getUsername(), []);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'login' | 'logout' | 'upload'>('all');
  const [liveMode, setLiveMode] = useState(false);

  const loadDashboardData = async () => {
    setError('');
    try {
      const [auditLogs, sessionStats] = await Promise.all([fetchAdminLogs(), fetchSessionStats()]);
      setLogs(auditLogs);
      setActiveUsers(sessionStats.active_users);
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Failed to load admin activity data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!liveMode) return;

    const timer = setInterval(() => {
      loadDashboardData();
    }, 10000);

    return () => clearInterval(timer);
  }, [liveMode]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const actionMatch = actionFilter === 'all' ? true : log.action.toLowerCase() === actionFilter;
      const queryMatch = q.length === 0
        ? true
        : `${log.username} ${log.action} ${log.detail}`.toLowerCase().includes(q);
      return actionMatch && queryMatch;
    });
  }, [logs, searchQuery, actionFilter]);

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminPageHeader
        title="Admin Dashboard"
        description={`Welcome${username ? `, ${username}` : ''}. You are signed in with admin privileges.`}
      />
      <div className="px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-6 md:p-8">

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <a
              href="/user-management"
              className="text-left rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-white hover:shadow transition cursor-pointer"
            >
              <div className="text-sm text-slate-500">User Management</div>
              <div className="mt-2 text-slate-800 font-bold">Role controls enabled</div>
            </a>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-white hover:shadow transition">
              <div className="text-sm text-slate-500">System Health</div>
              <div className="mt-2 text-slate-800 font-bold">Auth APIs online</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-white hover:shadow transition">
              <div className="text-sm text-slate-500">Audit Scope</div>
              <div className="mt-2 text-slate-800 font-bold">Session tracking active</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 hover:shadow transition">
              <div className="text-sm text-emerald-700">Session Tracking</div>
              <div className="mt-2 text-emerald-900 font-extrabold text-2xl">{activeUsers}</div>
              <div className="text-xs text-emerald-700 mt-1">currently active users</div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Activity Feed</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLiveMode((prev) => !prev)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold border ${liveMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-300 text-slate-700'}`}
                  >
                    {liveMode ? 'Live: ON' : 'Live: OFF'}
                  </button>
                  <button
                    onClick={loadDashboardData}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-3 grid md:grid-cols-3 gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, action, details"
                  className="md:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as 'all' | 'login' | 'logout' | 'upload')}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All actions</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="upload">Upload</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-4 text-sm text-slate-500">Loading activity logs...</div>
            ) : error ? (
              <div className="p-4 text-sm text-rose-700 bg-rose-50 border-t border-rose-200">{error}</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No activity yet.</div>
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
                    {filteredLogs.slice(0, 50).map((log, idx) => (
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
      </div>
    </div>
  );
}

export default AdminDashboard;
