import { useEffect, useState } from 'react';
import { FileDown, Eye, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';

interface CompanyRecord {
  id: string;
  company_name: string;
  check_date: string;
  loan_status: 'approved' | 'rejected' | 'pending';
  loan_amount: string;
  risk_level: 'low' | 'medium' | 'high';
  documents: {
    id: string;
    name: string;
    type: string;
    uploaded_at: string;
  }[];
  last_monitoring: string;
  monitoring_status: 'active' | 'inactive' | 'flagged';
  post_loan_score: number;
}

function CompanyHistory() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - Replace with API call
  useEffect(() => {
    const mockData: CompanyRecord[] = [
      {
        id: '1',
        company_name: 'TechCorp Solutions',
        check_date: '2024-03-15',
        loan_status: 'approved',
        loan_amount: '$500,000',
        risk_level: 'low',
        last_monitoring: '2024-03-25',
        monitoring_status: 'active',
        post_loan_score: 85,
        documents: [
          { id: '1', name: 'Balance_Sheet_2024.pdf', type: 'financial', uploaded_at: '2024-03-15' },
          { id: '2', name: 'Tax_Returns_2023.pdf', type: 'tax', uploaded_at: '2024-03-15' },
          { id: '3', name: 'Bank_Statement.pdf', type: 'bank', uploaded_at: '2024-03-15' },
        ],
      },
      {
        id: '2',
        company_name: 'Global Logistics Inc',
        check_date: '2024-02-20',
        loan_status: 'approved',
        loan_amount: '$750,000',
        risk_level: 'medium',
        last_monitoring: '2024-03-22',
        monitoring_status: 'active',
        post_loan_score: 72,
        documents: [
          { id: '4', name: 'Company_Profile.pdf', type: 'profile', uploaded_at: '2024-02-20' },
          { id: '5', name: 'Credit_Report.pdf', type: 'credit', uploaded_at: '2024-02-20' },
        ],
      },
      {
        id: '3',
        company_name: 'Fashion Retail Ltd',
        check_date: '2024-01-10',
        loan_status: 'rejected',
        loan_amount: '$300,000',
        risk_level: 'high',
        last_monitoring: '2024-01-15',
        monitoring_status: 'inactive',
        post_loan_score: 0,
        documents: [
          { id: '6', name: 'Initial_Assessment.pdf', type: 'assessment', uploaded_at: '2024-01-10' },
        ],
      },
      {
        id: '4',
        company_name: 'BuildRight Construction',
        check_date: '2024-03-01',
        loan_status: 'approved',
        loan_amount: '$1,200,000',
        risk_level: 'low',
        last_monitoring: '2024-03-24',
        monitoring_status: 'flagged',
        post_loan_score: 68,
        documents: [
          { id: '7', name: 'Project_Details.pdf', type: 'project', uploaded_at: '2024-03-01' },
          { id: '8', name: 'Financial_Forecast.pdf', type: 'forecast', uploaded_at: '2024-03-01' },
          { id: '9', name: 'Insurance_Certificate.pdf', type: 'insurance', uploaded_at: '2024-03-01' },
        ],
      },
    ];
    
    setCompanies(mockData);
    setLoading(false);
  }, []);

  const filteredCompanies = companies.filter((company) => {
    const matchesStatus = filterStatus === 'all' || company.loan_status === filterStatus;
    const matchesSearch = company.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: 'approved' | 'rejected' | 'pending') => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-100 text-emerald-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'high':
        return 'bg-rose-100 text-rose-800';
    }
  };

  const getMonitoringColor = (status: 'active' | 'inactive' | 'flagged') => {
    switch (status) {
      case 'active':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'inactive':
        return 'bg-slate-50 text-slate-700 border border-slate-200';
      case 'flagged':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
    }
  };

  const handleDownload = (docId: string, fileName: string) => {
    // TODO: Implement actual download from backend
    console.log(`Downloading document ${docId}: ${fileName}`);
    alert(`Download initiated for: ${fileName}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <AdminPageHeader
          title="Company History & Monitoring"
          description="View past company checks, loan status, and post-loan monitoring."
        />
        <div className="px-4 py-8">
          <p className="text-center text-slate-600">Loading company records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminPageHeader
        title="Company History & Monitoring"
        description="View past company checks, loan status, and post-loan monitoring."
      />

      <div className="px-4 py-8">
        <div className="mx-auto max-w-7xl">
          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-600 font-medium">Total Checks</div>
                  <div className="text-3xl font-bold text-slate-900 mt-2">{companies.length}</div>
                </div>
                <div className="text-4xl opacity-20">📊</div>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                    <CheckCircle size={16} />
                    Approved Loans
                  </div>
                  <div className="text-3xl font-bold text-emerald-900 mt-2">
                    {companies.filter((c) => c.loan_status === 'approved').length}
                  </div>
                </div>
                <div className="text-4xl opacity-30">✓</div>
              </div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-rose-700 font-medium flex items-center gap-2">
                    <XCircle size={16} />
                    Rejected Loans
                  </div>
                  <div className="text-3xl font-bold text-rose-900 mt-2">
                    {companies.filter((c) => c.loan_status === 'rejected').length}
                  </div>
                </div>
                <div className="text-4xl opacity-30">✕</div>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-amber-700 font-medium flex items-center gap-2">
                    <Clock size={16} />
                    Pending
                  </div>
                  <div className="text-3xl font-bold text-amber-900 mt-2">
                    {companies.filter((c) => c.loan_status === 'pending').length}
                  </div>
                </div>
                <div className="text-4xl opacity-30">⏱</div>
              </div>
            </div>
          </div>

          {/* Filter and Search */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company name..."
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
              </select>
              <div className="text-right text-sm text-slate-600 pt-2">
                {filteredCompanies.length} record(s) found
              </div>
            </div>
          </div>

          {/* Company Records */}
          <div className="space-y-4">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-bold text-slate-900">{company.company_name}</h3>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(company.loan_status)}`}>
                          {company.loan_status}
                        </span>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRiskColor(company.risk_level)}`}>
                          Risk: {company.risk_level}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-4 gap-6 text-sm text-slate-600">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Check Date</div>
                          <div className="font-semibold text-slate-900">
                            {new Date(company.check_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Loan Amount</div>
                          <div className="font-semibold text-slate-900">{company.loan_amount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Monitoring Status</div>
                          <div className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getMonitoringColor(company.monitoring_status)}`}>
                            {company.monitoring_status}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Post-Loan Score</div>
                          <div className="font-semibold text-slate-900">{company.post_loan_score}%</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="text-xs text-slate-500 mb-2">Last Monitoring: {new Date(company.last_monitoring).toLocaleDateString()}</div>
                        <button
                          onClick={() => setSelectedCompany(selectedCompany?.id === company.id ? null : company)}
                          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Eye size={16} />
                          {selectedCompany?.id === company.id ? 'Hide Details' : 'View Documents'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Document Details - Expandable */}
                  {selectedCompany?.id === company.id && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <FileDown size={18} />
                        Documents ({company.documents.length})
                      </h4>
                      <div className="space-y-2">
                        {company.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div>
                              <div className="font-semibold text-slate-900">{doc.name}</div>
                              <div className="text-xs text-slate-600 mt-1">
                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()} • Type: {doc.type}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownload(doc.id, doc.name)}
                              className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 transition"
                            >
                              <FileDown size={14} />
                              Download
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Monitoring Details */}
                      <div className="mt-6 grid md:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <TrendingUp size={16} />
                            Post-Loan Performance
                          </h5>
                          <div className="space-y-2 text-sm text-blue-800">
                            <p>Current Score: <span className="font-bold">{company.post_loan_score}%</span></p>
                            <p>Last Updated: {new Date(company.last_monitoring).toLocaleDateString()}</p>
                            <p>Trend: {company.post_loan_score >= 70 ? '📈 Stable' : '📉 Declining'}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <h5 className="font-semibold text-slate-900 mb-2">Monitoring Actions</h5>
                          <button className="w-full rounded-lg bg-slate-800 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-900 transition">
                            Update Monitoring Status
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredCompanies.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">No company records found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompanyHistory;
