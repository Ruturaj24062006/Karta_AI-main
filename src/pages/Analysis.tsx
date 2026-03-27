import { useEffect } from 'react';
import { Building2, Lightbulb, AlertTriangle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { WS_API_URL } from '../services/apiConfig';
import ProcessingStepper from '../components/ProcessingStepper';
import { useAnalysisStepper } from '../hooks/useAnalysisStepper';
import BackButton from '../components/BackButton';
import './Analysis.css';

function Analysis() {
  const [searchParams] = useSearchParams();
  const analysisId = Number(searchParams.get('id'));
  const navigate   = useNavigate();
  const { steps, progress, error, connected, isComplete } = useAnalysisStepper(analysisId);
  const wsEndpoint = `${WS_API_URL}/ws/analysis/${analysisId}`;

  useEffect(() => {
    if (isComplete && analysisId) {
      const t = setTimeout(() => navigate(`/dashboard?id=${analysisId}`), 1200);
      return () => clearTimeout(t);
    }
  }, [analysisId, isComplete, navigate]);

  return (
    <div className="analysis-running-page">
      <nav className="navbar">
        <BackButton fallbackTo="/new-analysis" label="Back" />
        <Link to="/" className="logo">
          <Building2 size={24} fill="#1C335B" stroke="none" />
          <span style={{ color: '#1C335B' }}>KARTA</span>
        </Link>
      </nav>

      <main className="main-content">
        <div className="tracking-card">
          <div className="tracking-header">
            <div className="header-left">
              <h1>Analysis #{analysisId} — Running Live</h1>
              <p>{connected ? 'KARTA AI is connected to backend WebSocket' : 'Connecting to backend WebSocket...'}</p>
            </div>
            <div className="header-right">
              <span className="progress-text">{Math.round(progress)}% Complete</span>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%`, transition: 'width 0.4s ease-out' }}></div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ margin: '1rem 1.5rem', padding: '12px', backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#B91C1C', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={18} />{error}
            </div>
          )}

          <div className="tracking-body">
            <ProcessingStepper steps={steps} />
            <div className="info-box">
              <Lightbulb size={18} className="info-icon" fill="currentColor" />
              <div className="info-text">
                {`Backend phases stream in real-time over ${wsEndpoint}. OCR, Fraud, and Risk phases update automatically.`}
              </div>
            </div>
          </div>
        </div>

        <div className="footer-note" style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {isComplete
            ? <Link to={`/dashboard?id=${analysisId}`} style={{ color: '#16a34a', fontWeight: 700 }}>✅ Complete — Redirecting to Dashboard...</Link>
            : 'Live WebSocket running — do not close this window'}
        </div>
      </main>
    </div>
  );
}

export default Analysis;
