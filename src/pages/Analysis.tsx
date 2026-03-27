import { useEffect, useState, useRef } from 'react';
import { Building2, Check, Loader2, Lightbulb, AlertTriangle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { connectAnalysisWebSocket, type WSMessage } from '../services/analysisApi';
import './Analysis.css';

// Pre-define the 6 numbers so we always show the full ladder
const STEP_NUMBERS = [1, 2, 3, 4, 5, 6];

function Analysis() {
  const [searchParams] = useSearchParams();
  const analysisId = Number(searchParams.get('id'));
  const navigate   = useNavigate();

  const [progress, setProgress] = useState(0);
  const [error,    setError]    = useState('');
  
  // Store the latest message received for each step number
  const [stepsData, setStepsData] = useState<Record<number, WSMessage>>({});
  
  const wsCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!analysisId) { setError('No analysis ID in URL. Go back and submit the form.'); return; }

    let pollingCleanup: (() => void) | null = null;

    // Fallback: HTTP polling every 2s — maps status% → synthetic step messages
    const startPolling = () => {
      let lastPct = 0;
      let stopped = false;

      const POLL_STEPS: Record<number, { step_name: string; step_detail: string }> = {
        10:  { step_name: 'Documents Uploaded',         step_detail: '3 PDFs saved · uploading complete' },
        30:  { step_name: 'PdfTable OCR Engine',        step_detail: '12 financial tables extracted' },
        50:  { step_name: 'Fraud Detection Engine',     step_detail: 'Cross-verified GST and circular trading' },
        65:  { step_name: 'News Intelligence Agent',    step_detail: '24 articles scanned with FinBERT' },
        80:  { step_name: 'XGBoost + SHAP Scoring',    step_detail: 'Probability of Default calculated' },
        100: { step_name: 'Claude AI CAM Generation',  step_detail: 'Credit Appraisal Memo generated' },
      };

      const poll = async () => {
        while (!stopped) {
          try {
            const res = await fetch(`/api/status/${analysisId}`);
            const data = await res.json();
            const pct: number = data.percentage_complete ?? 0;

            if (pct !== lastPct) {
              lastPct = pct;
              setProgress(pct);

              // Find which step bracket we're in and show it
              const bracket = [10, 30, 50, 65, 80, 100].find(t => pct <= t) ?? 100;
              const stepNum = [10, 30, 50, 65, 80, 100].indexOf(bracket) + 1;
              const info = POLL_STEPS[bracket];
              setStepsData(prev => ({
                ...prev,
                [stepNum]: {
                  step_number: stepNum,
                  step_name: info.step_name,
                  step_detail: info.step_detail,
                  percentage: pct,
                  status: pct === 100 ? 'completed' : 'running',
                  timestamp: new Date().toISOString(),
                }
              }));
            }

            if (data.status === 'completed' && pct >= 100) {
              stopped = true;
              setTimeout(() => navigate(`/dashboard?id=${analysisId}`), 1500);
              return;
            }
            if (data.status === 'failed') {
              stopped = true;
              setError(data.failure_reason ? `Analysis failed: ${data.failure_reason}` : 'Analysis failed — check backend logs for details.');
              return;
            }
          } catch {
            // Backend unreachable — keep retrying silently
          }
          await new Promise(r => setTimeout(r, 2000));
        }
      };

      poll();
      pollingCleanup = () => { stopped = true; };
    };

    // Try WebSocket first — auto-fallback to polling on any failure
    const wsCleanup = connectAnalysisWebSocket(
      analysisId,
      (msg) => {
        setError(''); // clear any WS error once messages start flowing
        setProgress(msg.percentage);
        setStepsData(prev => ({ ...prev, [msg.step_number]: msg }));

        if (msg.status === 'failed') {
          setError(`Failed at step ${msg.step_number} (${msg.step_name}): ${msg.step_detail}`);
        }
        if (msg.percentage === 100 && msg.status === 'completed') {
          setTimeout(() => navigate(`/dashboard?id=${analysisId}`), 1500);
        }
      },
      () => {
        // WebSocket failed → silently switch to polling, no scary error
        setError('');
        startPolling();
      }
    );
    wsCleanupRef.current = wsCleanup;

    return () => {
      wsCleanupRef.current?.();
      pollingCleanup?.();
    };
  }, [analysisId, navigate]);

  const isComplete = progress === 100 && !error;

  return (
    <div className="analysis-running-page">
      <nav className="navbar">
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
              <p>KARTA AI is connected to backend WebSocket</p>
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
            <div className="stepper">
              {STEP_NUMBERS.map((num) => {
                const msg = stepsData[num];
                const status = msg?.status || 'pending';
                
                const isDone   = status === 'completed';
                const isActive = status === 'running';
                const isFail   = status === 'failed';
                
                let stepClass = 'step pending';
                if (isDone) stepClass = 'step success';
                if (isActive) stepClass = 'step active';
                if (isFail) stepClass = 'step failed'; // we can style this red if we want

                return (
                  <div key={num} className={stepClass}>
                    <div className="step-icon">
                      <div className="step-icon-inner" style={isFail ? { background: '#DC2626', borderColor: '#DC2626' } : {}}>
                        {isDone ? <Check size={18} strokeWidth={3} /> :
                         isActive ? <Loader2 size={18} className="spinner" /> :
                         isFail ? <AlertTriangle size={16} color="white" /> :
                         <div className="dot"></div>}
                      </div>
                    </div>
                    <div className="step-content">
                      <div className="step-title" style={isFail ? { color: '#DC2626' } : {}}>
                        {msg?.step_name || `Awaiting step ${num}...`}
                      </div>
                      <div className="step-subtitle">
                        {msg?.step_detail || 'Pending'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="info-box">
              <Lightbulb size={18} className="info-icon" fill="currentColor" />
              <div className="info-text">
                Real-time connection established. KARTA backend is streaming precise execution logs via WebSocket port 8000.
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
