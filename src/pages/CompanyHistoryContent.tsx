import { useEffect, useState } from 'react';
import { fetchCompanyHistory, type CompanyHistoryItem } from '../services/companyHistoryApi';

function CompanyHistoryContent() {
  const [history, setHistory] = useState<CompanyHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const loadHistory = async () => {
    setError('');
    try {
      const data = await fetchCompanyHistory();
      setHistory(data);
    } catch (err: any) {
      setError(err?.userMessage || err?.response?.data?.detail || 'Failed to load company history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredHistory = history.filter((item) => {
    if (!filter) return true;
    return (
      item.company_name.toLowerCase().includes(filter.toLowerCase()) ||
      item.cin_number.toLowerCase().includes(filter.toLowerCase()) ||
      item.gstin_number.toLowerCase().includes(filter.toLowerCase())
    );
  });

  return (
    <div className="admin-view-section">
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-slate-900">Company History</h3>
            <button onClick={loadHistory} className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-white">
              Refresh
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filter by company name, CIN, or GSTIN..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-600">Loading company history...</div>
        ) : error ? (
          <div className="p-6 text-rose-700 bg-rose-50 border-t border-rose-200">{error}</div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-6 text-center text-slate-600">{filter ? 'No matching companies found.' : 'No company history available.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">Company Name</th>
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">CIN</th>
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">GSTIN</th>
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">Analysis Status</th>
                  <th className="px-6 py-4 text-left text-slate-600 font-semibold">Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{item.company_name}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-mono">{item.cin_number}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-mono">{item.gstin_number}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          item.analysis_status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.analysis_status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.analysis_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{new Date(item.last_checked).toLocaleDateString()}</td>
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

export default CompanyHistoryContent;
