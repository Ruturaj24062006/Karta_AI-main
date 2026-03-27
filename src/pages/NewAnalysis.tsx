import { useState } from 'react';
import { Triangle, CloudUpload, FileUp, FileText, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadCompanyDocuments } from '../services/uploadApi';
import { triggerAnalysis } from '../services/analysisApi';
import { ErrorBanner } from '../services/useApi';
import './NewAnalysis.css';

function NewAnalysis() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ companyName: '', cin: '', gstin: '', pan: '', amount: '' });
  const [files, setFiles] = useState({ balanceSheet: null as File | null, bankStatements: null as File | null, gstFilings: null as File | null });
  const [uploadPct, setUploadPct] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof files) => {
    if (e.target.files?.[0]) setFiles({ ...files, [type]: e.target.files[0] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.companyName || !formData.cin || !formData.gstin || !formData.pan || !formData.amount) {
      setErrorMsg('Please fill in all required text fields.'); return;
    }
    if (!files.balanceSheet || !files.bankStatements || !files.gstFilings) {
      setErrorMsg('Please upload all 3 required financial documents.'); return;
    }

    setIsSubmitting(true);
    setUploadPct(0);
    try {
      // STEP 1: Upload files with real byte progress
      const result = await uploadCompanyDocuments({
        company_name:  formData.companyName,
        cin_number:    formData.cin,
        gstin_number:  formData.gstin,
        pan_number:    formData.pan,
        loan_amount:   formData.amount,
        balance_sheet: files.balanceSheet,
        bank_statement: files.bankStatements,
        gst_filing:    files.gstFilings,
        onProgress:    setUploadPct,
      });

      // STEP 2: Trigger analysis (fire-and-forget, backend processes async)
      triggerAnalysis(result.analysis_id).catch(console.error);

      // STEP 3: Go to the analysis loading screen
      navigate(`/analysis?id=${result.analysis_id}`);
    } catch (err: any) {
      setErrorMsg(err.userMessage || err.message || 'Upload failed. Check backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="analysis-page">
      <nav className="navbar">
        <div className="logo" style={{ color: '#1C335B' }}>
          <Triangle size={24} fill="#1C335B" stroke="none" style={{ transform: 'rotate(180deg)' }} />
          KARTA
        </div>
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <span className="nav-separator">/</span>
          <Link to="/new-analysis" className="nav-link active" style={{ color: '#1C335B' }}>New Analysis</Link>
        </div>
      </nav>

      <div className="layout-container">
        <div className="card form-card">
          <h1>New Credit Analysis</h1>
          <p className="subtitle">Enter company details and upload financial documents to begin</p>
          <div className="divider"></div>

          <ErrorBanner message={errorMsg} onRetry={() => setErrorMsg('')} />

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {[
                { label: 'Company Name', name: 'companyName', placeholder: 'Enter legal entity name', value: formData.companyName },
                { label: 'CIN Number', name: 'cin', placeholder: '21-character CIN e.g. U28990MH2018PTC123456', value: formData.cin },
                { label: 'GSTIN Number', name: 'gstin', placeholder: '15-character GSTIN e.g. 27AAAPZ1234F1Z5', value: formData.gstin },
                { label: 'PAN Number', name: 'pan', placeholder: '10-character PAN e.g. AAAPZ1234F', value: formData.pan },
              ].map(({ label, name, placeholder, value }) => (
                <div className="form-group" key={name}>
                  <label className="form-label">{label} <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" name={name} className="form-input" placeholder={placeholder}
                    value={value} onChange={handleInputChange} required />
                </div>
              ))}

              <div className="form-group full-width">
                <label className="form-label">Loan Amount Requested <span style={{ color: 'red' }}>*</span></label>
                <div className="input-with-prefix" style={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem', overflow: 'hidden' }}>
                  <span className="input-prefix">₹</span>
                  <input type="number" name="amount" className="form-input" placeholder="e.g. 30000000 for ₹3 Crore"
                    style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}
                    value={formData.amount} onChange={handleInputChange} required />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2.5rem' }}>
              <h2>Upload Financial Documents <span style={{ color: 'red', fontSize: '1rem' }}>*</span></h2>
              <p className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>PDF format only. Max 10MB per file. All 3 required.</p>

              <div className="upload-grid">
                {([
                  { key: 'balanceSheet', label: 'Balance Sheet', sub: '3 years financial statements', Icon: CloudUpload },
                  { key: 'bankStatements', label: 'Bank Statements', sub: 'Last 12 months', Icon: FileUp },
                  { key: 'gstFilings', label: 'GST Filings', sub: 'Last 12 months', Icon: FileText },
                ] as const).map(({ key, label, sub, Icon }) => {
                  const uploaded = !!files[key];
                  return (
                    <label key={key} className={`upload-card ${uploaded ? 'uploaded' : ''}`}
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <input type="file" accept=".pdf" style={{ display: 'none' }}
                        onChange={(e) => handleFileChange(e, key)} />
                      <div className="upload-icon">
                        <Icon size={24} color={uploaded ? '#16a34a' : '#1C335B'} />
                      </div>
                      <div className="upload-title" style={{ color: '#1C335B' }}>{label}</div>
                      <div className="upload-subtitle">{sub}</div>
                      <div className="upload-link" style={{ color: uploaded ? '#16a34a' : '#1C335B', fontWeight: uploaded ? 'bold' : 'normal', marginTop: 'auto' }}>
                        {uploaded ? `✅ ${files[key]!.name}` : 'Click to upload PDF'}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Submit button with REAL upload progress */}
            <button type="submit" disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting ? '#1C335B' : '#1C335B',
                display: 'flex', border: 'none', width: '100%',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                position: 'relative', overflow: 'hidden',
                borderRadius: 8, padding: '14px 24px', color: 'white',
                fontWeight: 700, fontSize: '1rem', justifyContent: 'center', gap: 8,
                marginTop: '2rem',
              }}>
              {/* Real upload progress fill */}
              {isSubmitting && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${uploadPct}%`, background: 'rgba(255,255,255,0.15)',
                  transition: 'width 0.3s ease',
                }} />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {isSubmitting
                  ? uploadPct < 100 ? `⬆️ Uploading... ${uploadPct}%` : '⚙️ Initialising KARTA Analysis...'
                  : '🚀 Run KARTA Analysis'}
              </span>
            </button>
            <p className="security-note" style={{ textAlign: 'center', marginTop: '1rem' }}>
              Your documents are processed securely. RBI-compliant audit trail maintained.
            </p>
          </form>
        </div>

        <div className="card sidebar-card">
          <div className="sidebar-title">WHAT KARTA ANALYSES:</div>
          <div className="sidebar-list">
            {['Financial ratios and trends', 'GST mismatch and fraud', 'Promoter background check', 'News and market signals', 'Sector-specific risk scoring']
              .map((item, i) => (
                <div key={i} className="sidebar-list-item">
                  <CheckCircle2 size={18} fill="#1C335B" color="white" className="sidebar-list-icon" />
                  <span>{item}</span>
                </div>
              ))}
          </div>
          <div className="testimonial">
            <p className="testimonial-text">"KARTA simplified our due diligence from weeks to minutes."</p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">CTO, FinBank</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">© 2024 KARTA AI Technologies. All rights reserved.</footer>
    </div>
  );
}

export default NewAnalysis;
