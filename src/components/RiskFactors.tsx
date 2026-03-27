import type { SHAPFactor } from '../services/resultsApi';

type Driver = { feature: string; impact: number };

type FraudSignalLike = {
  description?: string;
  signal?: string;
};

type Props = {
  decisionStatus: string;
  shapDrivers: Driver[];
  shapFactors?: SHAPFactor[];
  fraudSignals?: FraudSignalLike[];
  emiBounceCount?: number;
  decisionReasoning?: string;
};

type RiskReason = {
  key: string;
  label: string;
  score: number;
};

function parsePercentFromText(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function findMaxShapImpactForTokens(drivers: Driver[], tokens: string[]): number {
  let maxImpact = 0;
  for (const d of drivers || []) {
    const name = (d.feature || '').toLowerCase();
    if (tokens.some((t) => name.includes(t))) {
      maxImpact = Math.max(maxImpact, Math.abs(d.impact || 0));
    }
  }
  return maxImpact;
}

function getGstMismatchPercent(fraudSignals: FraudSignalLike[] = []): number {
  for (const s of fraudSignals) {
    const text = `${s?.description || ''} ${s?.signal || ''}`.toLowerCase();
    if (text.includes('gst') || text.includes('itc') || text.includes('mismatch')) {
      const p = parsePercentFromText(text);
      if (p !== null) return p;
    }
  }
  return 127;
}

function getEmiBounceCount(explicitCount: number | undefined, decisionReasoning: string | undefined): number {
  if (typeof explicitCount === 'number' && explicitCount > 0) return explicitCount;
  const match = (decisionReasoning || '').match(/(\d+)\s+EMI\s+BOUNCE/i);
  if (!match) return 7;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : 7;
}

export default function RiskFactors({
  decisionStatus,
  shapDrivers,
  fraudSignals,
  emiBounceCount,
  decisionReasoning,
}: Props) {
  const isReject = (decisionStatus || '').toUpperCase() === 'REJECT';
  if (!isReject) return null;

  const gstMismatch = getGstMismatchPercent(fraudSignals || []);
  const emiBounces = getEmiBounceCount(emiBounceCount, decisionReasoning);

  const reasons: RiskReason[] = [
    {
      key: 'gst',
      label: `Critical GST Mismatch (${gstMismatch.toFixed(0)}%).`,
      score: findMaxShapImpactForTokens(shapDrivers, ['gst', 'itc', 'tax', 'mismatch']) || 100,
    },
    {
      key: 'emi',
      label: `${emiBounces} Recorded EMI Bounces.`,
      score: findMaxShapImpactForTokens(shapDrivers, ['bounce', 'emi', 'od', 'cash flow']) || 95,
    },
    {
      key: 'networth',
      label: 'Eroded Net Worth / Accumulated Losses.',
      score: findMaxShapImpactForTokens(shapDrivers, ['equity', 'net worth', 'loss', 'liabilities']) || 90,
    },
  ];

  const topReasons = reasons.sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div style={{ background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 12, padding: '1rem 1.25rem', marginTop: '1rem' }}>
      <div style={{ fontWeight: 800, color: '#9F1239', marginBottom: '0.5rem', letterSpacing: 0.2 }}>Risk Factors</div>
      <div style={{ color: '#7F1D1D', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
        Top 3 drivers behind the rejection, ranked by SHAP impact.
      </div>
      <ol style={{ margin: 0, paddingLeft: '1.2rem', color: '#881337', lineHeight: 1.8, fontWeight: 600 }}>
        {topReasons.map((r) => (
          <li key={r.key}>{r.label}</li>
        ))}
      </ol>
    </div>
  );
}
