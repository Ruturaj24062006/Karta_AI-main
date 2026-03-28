import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ErrorBanner } from '../services/useApi';
import api from '../services/apiConfig';
import './Analytics.css';

interface CompanyAnalytic {
  id: number;
  company_name: string;
  cin_number: string;
  status: 'approved' | 'rejected' | 'pending';
  analysis_date: string;
  risk_level: string;
  amount: number;
}

interface HistoryRecord {
  analysis_id: number;
  company_name: string;
  cin_number?: string;
  created_at: string;
  status: string;
  decision?: string;
  fraud_risk_level?: string;
  loan_amount_requested?: number;
}

interface AnalyticsStats {
  total_companies: number;
  approved_companies: number;
  rejected_companies: number;
  pending_companies: number;
  approval_rate: number;
  recent_analyses: CompanyAnalytic[];
}

function Analytics() {
  const [stats, setStats] = useState<AnalyticsStats>({
    total_companies: 0,
    approved_companies: 0,
    rejected_companies: 0,
    pending_companies: 0,
    approval_rate: 0,
    recent_analyses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all');

  function normalizeStatus(historyStatus: string, decision?: string): 'approved' | 'rejected' | 'pending' {
    const hs = String(historyStatus || '').toLowerCase();
    const dec = String(decision || '').toUpperCase();

    if (hs !== 'completed') return 'pending';
    if (dec === 'REJECT') return 'rejected';
    if (dec === 'APPROVE' || dec === 'CONDITIONAL') return 'approved';
    return 'pending';
  }

  const loadAnalytics = async () => {
    setError('');
    if (stats.total_companies === 0) {
      setLoading(true);
    }
    try {
      const { data } = await api.get<HistoryRecord[]>('/api/history');
      const records = (data || []).map((r) => {
        const status = normalizeStatus(r.status, r.decision);
        return {
          id: r.analysis_id,
          company_name: r.company_name || 'Unknown Company',
          cin_number: r.cin_number || 'N/A',
          status,
          analysis_date: r.created_at || new Date().toISOString(),
          risk_level: String(r.fraud_risk_level || 'MEDIUM').toUpperCase(),
          amount: Number(r.loan_amount_requested || 0),
        } as CompanyAnalytic;
      });

      const total = records.length;
      const approved = records.filter((r) => r.status === 'approved').length;
      const rejected = records.filter((r) => r.status === 'rejected').length;
      const pending = records.filter((r) => r.status === 'pending').length;
      const approvalRate = total > 0 ? (approved / total) * 100 : 0;

      setStats({
        total_companies: total,
        approved_companies: approved,
        rejected_companies: rejected,
        pending_companies: pending,
        approval_rate: approvalRate,
        recent_analyses: records.slice(0, 100),
      });
    } catch (err: any) {
      setError(err?.userMessage || err?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadAnalytics();
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredAnalyses = filter === 'all' 
    ? stats.recent_analyses 
    : stats.recent_analyses.filter(a => a.status === filter);

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 size={18} className="status-icon-approved" />;
    if (status === 'rejected') return <XCircle size={18} className="status-icon-rejected" />;
    return <Clock size={18} className="status-icon-pending" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return '#10b981';
    if (status === 'rejected') return '#ef4444';
    return '#f59e0b';
  };

  const getRiskColor = (level: string) => {
    if (level === 'HIGH') return '#ef4444';
    if (level === 'MEDIUM') return '#f59e0b';
    return '#10b981';
  };

  function crore(n: number) { 
    return (n / 10000000).toFixed(1); 
  }

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="analytics-title-section">
          <BarChart3 size={32} className="analytics-icon" />
          <div>
            <h1>Company Analytics</h1>
            <p>Approval and rejection statistics across all analyzed companies · Live data every 15s</p>
          </div>
        </div>
        <button onClick={loadAnalytics} className="refresh-btn">
          Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadAnalytics} />}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <BarChart3 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Companies</div>
            <div className="stat-value">{stats.total_companies}</div>
            <div className="stat-detail">Analyzed this period</div>
          </div>
        </div>

        <div className="stat-card approved">
          <div className="stat-icon">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Approved</div>
            <div className="stat-value">{stats.approved_companies}</div>
            <div className="stat-detail">{stats.approval_rate.toFixed(1)}% approval rate</div>
          </div>
        </div>

        <div className="stat-card rejected">
          <div className="stat-icon">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{stats.rejected_companies}</div>
            <div className="stat-detail">{(stats.total_companies > 0 ? (stats.rejected_companies / stats.total_companies) * 100 : 0).toFixed(1)}% rejection rate</div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{stats.pending_companies}</div>
            <div className="stat-detail">Under review</div>
          </div>
        </div>
      </div>

      {/* Approval Rate Visualization */}
      <div className="chart-container">
        <h2>Approval Distribution</h2>
        <div className="approval-chart">
          <div className="chart-bar">
            <div 
              className="chart-bar-segment approved" 
              style={{ width: `${stats.total_companies > 0 ? (stats.approved_companies / stats.total_companies) * 100 : 0}%` }}
            >
              <span className="bar-label">{stats.approved_companies}</span>
            </div>
            <div 
              className="chart-bar-segment rejected" 
              style={{ width: `${stats.total_companies > 0 ? (stats.rejected_companies / stats.total_companies) * 100 : 0}%` }}
            >
              <span className="bar-label">{stats.rejected_companies}</span>
            </div>
            <div 
              className="chart-bar-segment pending" 
              style={{ width: `${stats.total_companies > 0 ? (stats.pending_companies / stats.total_companies) * 100 : 0}%` }}
            >
              <span className="bar-label">{stats.pending_companies}</span>
            </div>
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color approved"></div>
              <span>Approved: {stats.approved_companies}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color rejected"></div>
              <span>Rejected: {stats.rejected_companies}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color pending"></div>
              <span>Pending: {stats.pending_companies}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="recent-container">
        <div className="recent-header">
          <h2>Recent Company Analyses</h2>
          <div className="filter-buttons">
            {(['all', 'approved', 'rejected', 'pending'] as const).map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="analyses-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>CIN Number</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th>Loan Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnalyses.map(analysis => (
                <tr key={analysis.id} className={`row-${analysis.status}`}>
                  <td className="company-name">{analysis.company_name}</td>
                  <td className="cin-number">{analysis.cin_number}</td>
                  <td className="status-cell">
                    <div className="status-badge" style={{ color: getStatusColor(analysis.status) }}>
                      {getStatusIcon(analysis.status)}
                      {analysis.status.toUpperCase()}
                    </div>
                  </td>
                  <td className="risk-cell">
                    <span 
                      className="risk-badge" 
                      style={{ color: getRiskColor(analysis.risk_level), borderColor: getRiskColor(analysis.risk_level) }}
                    >
                      {analysis.risk_level}
                    </span>
                  </td>
                  <td className="amount-cell">₹{crore(analysis.amount)} Cr</td>
                  <td className="date-cell">{new Date(analysis.analysis_date).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
