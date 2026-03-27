import { useEffect, useMemo, useState } from 'react';
import { getUsername } from '../services/auth';
import { fetchAdminLogs, fetchSessionStats, type ActivityLogItem } from '../services/adminApi';

function AdminDashboardContent() {
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
      const queryMatch = q.length === 0 ? true : `${log.username} ${log.action} ${log.detail}`.toLowerCase().includes(q);
      return actionMatch && queryMatch;
    });
  }, [logs, searchQuery, actionFilter]);

  return (
    <div className="admin-view-section">
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Active Users</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{activeUsers}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm text-emerald-700">System Status</div>
          <div className="text-xl font-bold text-emerald-900 mt-2">Online</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-blue-700">Total Logs</div>
          <div className="text-3xl font-bold text-blue-900 mt-2">{logs.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-600">Admin</div>
          <div className="mt-2 text-slate-900 font-semibold">{username || 'User'}</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Activity Feed</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                liveMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              {liveMode ? 'Live: ON' : 'Live: OFF'}
            </button>
            <button onClick={loadDashboardData} className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50">
              Refresh
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="upload">Upload</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center text-slate-600 py-4">Loading...</p>
        ) : error ? (
          <p className="text-center text-rose-700 bg-rose-50 p-3 rounded">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-slate-600 font-semibold">Time</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-semibold">User</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-semibold">Action</th>
                  <th className="px-4 py-3 text-left text-slate-600 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 20).map((log, idx) => (
                  <tr key={`${log.timestamp}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{log.username}</td>
                    <td className="px-4 py-3 uppercase text-xs text-slate-600">{log.action}</td>
                    <td className="px-4 py-3 text-slate-700">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboardContent;
