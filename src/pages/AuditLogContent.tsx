import { useEffect, useState } from 'react';
import { fetchAuditLogs, type AuditLog } from '../services/auditLogApi.ts';

function AuditLogContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const loadLogs = async () => {
    setError('');
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!filter) return true;
    return (
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.username.toLowerCase().includes(filter.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(filter.toLowerCase()) ||
      log.details.toLowerCase().includes(filter.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIdx = (page - 1) * itemsPerPage;
  const pageLogsLocal = filteredLogs.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="admin-view-section">
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-slate-900">Audit Logs</h3>
            <button onClick={loadLogs} className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-white">
              Refresh
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filter by action, user, resource type..."
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-600">Loading audit logs...</div>
        ) : error ? (
          <div className="p-6 text-rose-700 bg-rose-50 border-t border-rose-200">{error}</div>
        ) : pageLogsLocal.length === 0 ? (
          <div className="p-6 text-center text-slate-600">{filter ? 'No matching logs found.' : 'No audit logs available.'}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-slate-600 font-semibold">Timestamp</th>
                    <th className="px-6 py-4 text-left text-slate-600 font-semibold">User</th>
                    <th className="px-6 py-4 text-left text-slate-600 font-semibold">Action</th>
                    <th className="px-6 py-4 text-left text-slate-600 font-semibold">Resource</th>
                    <th className="px-6 py-4 text-left text-slate-600 font-semibold">Details</th>
                    <th className="px-6 py-4 text-left text-slate-600 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageLogsLocal.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-700 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{log.username}</td>
                      <td className="px-6 py-4 uppercase text-xs font-semibold text-slate-600">{log.action}</td>
                      <td className="px-6 py-4 text-slate-600 text-xs">{log.resource_type}</td>
                      <td className="px-6 py-4 text-slate-600 text-xs line-clamp-2">{log.details}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AuditLogContent;
