import { useEffect, useMemo, useState } from 'react';
import { getAnalysisStatus } from '../services/analysisApi';
import { WS_API_URL } from '../services/apiConfig';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ProcessingStep {
  id: number;
  title: string;
  detail: string;
  status: StepStatus;
  timestamp?: string;
}

interface AnalysisWSMessage {
  step_number: number;
  step_name: string;
  step_detail: string;
  percentage: number;
  status: 'running' | 'completed' | 'failed';
  timestamp: string;
}

const DEFAULT_STEPS: ProcessingStep[] = [
  { id: 1, title: 'Phase 1: Documents', detail: 'Waiting for upload', status: 'pending' },
  { id: 2, title: 'Phase 2: OCR', detail: 'PaddleOCR extraction pending', status: 'pending' },
  { id: 3, title: 'Phase 3: Fraud', detail: 'Fraud checks pending', status: 'pending' },
  { id: 4, title: 'Phase 4: News', detail: 'News intelligence pending', status: 'pending' },
  { id: 5, title: 'Phase 5: Risk', detail: 'Risk scoring pending', status: 'pending' },
  { id: 6, title: 'Phase 6: CAM', detail: 'CAM generation pending', status: 'pending' },
];

export function useAnalysisStepper(analysisId: number | undefined) {
  const [steps, setSteps] = useState<ProcessingStep[]>(DEFAULT_STEPS);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const wsUrl = useMemo(() => {
    if (!analysisId) return '';
    return `${WS_API_URL}/ws/analysis/${analysisId}`;
  }, [analysisId]);

  useEffect(() => {
    if (!analysisId || !wsUrl) {
      setError('Missing analysis ID.');
      return;
    }

    setError('');
    setConnected(false);
    setProgress(0);
    setSteps(DEFAULT_STEPS);

    let pollTimer: number | null = null;
    let wsFailed = false;
    let disposed = false;
    let opened = false;
    let intentionalClose = false;

    const mapPctToStep = (pct: number) => {
      if (pct <= 10) return 1;
      if (pct <= 30) return 2;
      if (pct <= 50) return 3;
      if (pct <= 65) return 4;
      if (pct <= 80) return 5;
      return 6;
    };

    const startPolling = () => {
      if (pollTimer !== null) return;

      pollTimer = window.setInterval(async () => {
        if (!analysisId) return;

        try {
          const status = await getAnalysisStatus(analysisId);
          const pct = status.percentage_complete ?? 0;
          const stepNo = mapPctToStep(pct);

          setProgress(pct);
          setSteps((prev) =>
            prev.map((step) => {
              if (step.id < stepNo) {
                return { ...step, status: 'completed' };
              }
              if (step.id === stepNo) {
                return {
                  ...step,
                  status: status.status === 'failed' ? 'failed' : status.status === 'completed' && pct >= 100 ? 'completed' : 'running',
                  detail:
                    status.status === 'failed'
                      ? (status.failure_reason || 'Analysis failed')
                      : `Processing... ${Math.round(pct)}%`,
                };
              }
              return step;
            })
          );

          if (status.status === 'failed') {
            setError(status.failure_reason || 'Analysis failed.');
            if (pollTimer !== null) {
              window.clearInterval(pollTimer);
              pollTimer = null;
            }
          }

          if (status.status === 'completed' && pct >= 100 && pollTimer !== null) {
            window.clearInterval(pollTimer);
            pollTimer = null;
          }
        } catch {
          // Keep retrying silently when backend is temporarily unavailable.
        }
      }, 2000);
    };

    const ws = new WebSocket(wsUrl);

    let connectTimeout: number | null = window.setTimeout(() => {
      if (disposed || opened) return;
      wsFailed = true;
      setConnected(false);
      setError('Realtime channel is unavailable. Switched to status polling.');
      startPolling();
      intentionalClose = true;
      try {
        ws.close();
      } catch {
        // Ignore close errors.
      }
    }, 8000);

    ws.onopen = () => {
      opened = true;
      if (connectTimeout !== null) {
        window.clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      if (disposed) {
        // Component already unmounted; close quietly without touching state.
        intentionalClose = true;
        ws.close();
        return;
      }
      setConnected(true);
      setError('');
      console.log(`[WS] Connected: ${wsUrl}`);
    };

    ws.onerror = () => {
      if (disposed || intentionalClose) return;
      wsFailed = true;
      if (connectTimeout !== null) {
        window.clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      setError('Realtime channel disconnected. Switched to status polling.');
      setConnected(false);
      startPolling();
    };

    ws.onclose = () => {
      if (disposed || intentionalClose) return;
      if (connectTimeout !== null) {
        window.clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      setConnected(false);
      if (wsFailed) return;
      startPolling();
    };

    ws.onmessage = (event) => {
      try {
        const msg: AnalysisWSMessage = JSON.parse(event.data);
        setProgress(msg.percentage ?? 0);

        setSteps((prev) =>
          prev.map((step) => {
            if (step.id < msg.step_number) {
              return { ...step, status: 'completed' };
            }
            if (step.id === msg.step_number) {
              return {
                ...step,
                title: `Phase ${step.id}: ${msg.step_name}`,
                detail: msg.step_detail,
                status: msg.status,
                timestamp: msg.timestamp,
              };
            }
            return step;
          })
        );

        if (msg.status === 'failed') {
          setError(`Phase ${msg.step_number} failed: ${msg.step_detail}`);
        }
      } catch {
        console.warn('[WS] Invalid message:', event.data);
      }
    };

    return () => {
      disposed = true;
      if (connectTimeout !== null) {
        window.clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      // Avoid closing while CONNECTING; in StrictMode that triggers a noisy
      // "WebSocket is closed before the connection is established" browser error.
      if (ws.readyState === WebSocket.OPEN) {
        intentionalClose = true;
        ws.close();
      }
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    };
  }, [analysisId, wsUrl]);

  return {
    steps,
    progress,
    error,
    connected,
    isComplete: progress >= 100 && !error,
  };
}
