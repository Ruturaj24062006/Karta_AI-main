import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ErrorBanner } from '../services/useApi';
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

  const loadAnalytics = async () => {
    setError('');
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockStats: AnalyticsStats = {
        total_companies: 156,
        approved_companies: 118,
        rejected_companies: 28,
        pending_companies: 10,
        approval_rate: 75.6,
        recent_analyses: [
          { id: 1, company_name: 'Tech Solutions India Ltd', cin_number: 'U29999MH2020PTC345678', status: 'approved', analysis_date: '2026-03-25', risk_level: 'LOW', amount: 50000000 },
          { id: 2, company_name: 'Global Trade Corp', cin_number: 'U72999DL2019PTC456789', status: 'approved', analysis_date: '2026-03-24', risk_level: 'LOW', amount: 75000000 },
          { id: 3, company_name: 'Finance Plus LLC', cin_number: 'U65999KA2021PTC567890', status: 'rejected', analysis_date: '2026-03-23', risk_level: 'HIGH', amount: 25000000 },
          { id: 4, company_name: 'Smart Ventures Inc', cin_number: 'U80999GJ2018PTC678901', status: 'approved', analysis_date: '2026-03-22', risk_level: 'MEDIUM', amount: 100000000 },
          { id: 5, company_name: 'Business Dynamics', cin_number: 'U45999TN2020PTC789012', status: 'rejected', analysis_date: '2026-03-21', risk_level: 'HIGH', amount: 30000000 },
          { id: 6, company_name: 'Industrial Growth Ltd', cin_number: 'U91999MH2017PTC890123', status: 'approved', analysis_date: '2026-03-20', risk_level: 'LOW', amount: 120000000 },
          { id: 7, company_name: 'Export Masters', cin_number: 'U48999AP2019PTC901234', status: 'pending', analysis_date: '2026-03-19', risk_level: 'MEDIUM', amount: 85000000 },
        ],
      };
      setStats(mockStats);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
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
            <p>Approval and rejection statistics across all analyzed companies</p>
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
            <div className="stat-detail">{((stats.rejected_companies / stats.total_companies) * 100).toFixed(1)}% rejection rate</div>
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
              style={{ width: `${(stats.approved_companies / stats.total_companies) * 100}%` }}
            >
              <span className="bar-label">{stats.approved_companies}</span>
            </div>
            <div 
              className="chart-bar-segment rejected" 
              style={{ width: `${(stats.rejected_companies / stats.total_companies) * 100}%` }}
            >
              <span className="bar-label">{stats.rejected_companies}</span>
            </div>
            <div 
              className="chart-bar-segment pending" 
              style={{ width: `${(stats.pending_companies / stats.total_companies) * 100}%` }}
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
