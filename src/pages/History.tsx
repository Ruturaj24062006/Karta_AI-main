import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Zap, FileText, Activity, ShieldAlert, ArrowRight, Home } from 'lucide-react';
import './History.css';
import api from '../services/apiConfig';

function History() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get('/api/history')
            .then(res => {
                setHistory(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Failed to load analysis history");
                setLoading(false);
            });
    }, []);

    const getStatusBadge = (status: string, reason?: string) => {
        if (status === 'completed') return <span className="status-badge status-success">Completed</span>;
        if (status === 'failed') return <span className="status-badge status-fail" title={reason}>Failed</span>;
        return <span className="status-badge status-processing">Processing</span>;
    };

    const getRiskColor = (risk: string) => {
        if (risk === 'HIGH' || risk === 'CRITICAL') return '#EF4444';
        if (risk === 'MEDIUM') return '#F59E0B';
        if (risk === 'LOW' || risk === 'GOOD') return '#10B981';
        return '#64748B';
    };

    return (
        <div className="history-page">
            <nav className="history-navbar">
                <Link to="/" className="logo-container">
                    <Zap size={24} fill="#1C335B" stroke="none" />
                    <span>KARTA AI</span>
                </Link>
                <div className="nav-center-title">
                    <Clock size={16} /> Analysis Portfolio History
                </div>
                <Link to="/new-analysis" className="btn btn-primary btn-sm">
                    Run New Analysis
                </Link>
            </nav>

            <div className="history-container">
                <div className="history-header">
                    <h1>Portfolio Audit Log</h1>
                    <p>Showing all historically processed credit appraisals natively archived into the KARTA engine.</p>
                </div>

                {loading ? (
                    <div className="history-loading">Fetching historical archives...</div>
                ) : error ? (
                    <div className="history-error">{error}</div>
                ) : history.length === 0 ? (
                    <div className="history-empty">
                        <FileText size={48} color="#CBD5E1" />
                        <h2>No analysis history found</h2>
                        <p>Run your first credit appraisal to populate this dashboard.</p>
                    </div>
                ) : (
                    <div className="history-table-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Date</th>
                                    <th>Company Name</th>
                                    <th>Decision</th>
                                    <th>Status</th>
                                    <th>Risk Footprint</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((record) => (
                                    <tr key={record.analysis_id} className={record.status === 'failed' ? 'row-failed' : ''}>
                                        <td className="font-mono text-sm text-slate-500">#{record.analysis_id}</td>
                                        <td>{new Date(record.created_at).toLocaleDateString()}</td>
                                        <td className="font-bold">{record.company_name}</td>
                                        <td>
                                            {record.status === 'completed' && record.decision ? (
                                                <div className={`decision-pill decision-${record.decision.toLowerCase()}`}>
                                                    {record.decision}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td>{getStatusBadge(record.status, record.failure_reason)}</td>
                                        <td className="risk-metrics">
                                            {record.status === 'completed' ? (
                                                <div className="risk-pills">
                                                    <span style={{ color: getRiskColor(record.fraud_risk_level) }}>
                                                        <ShieldAlert size={14} /> Fraud {record.fraud_risk_level}
                                                    </span>
                                                    <span>
                                                        <Activity size={14} /> PD: {record.probability_of_default?.toFixed(1) || '?'}%
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="action-cell">
                                            {record.status === 'completed' ? (
                                                <Link to={`/dashboard?id=${record.analysis_id}`} className="btn-view">
                                                    View Report <ArrowRight size={14} />
                                                </Link>
                                            ) : (
                                                <Link to={`/analysis?id=${record.analysis_id}`} className="btn-view btn-view-resume">
                                                    Resume <ArrowRight size={14} />
                                                </Link>
                                            )}
                                        </td>
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

export default History;
