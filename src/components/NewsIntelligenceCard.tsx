import { useEffect, useMemo, useState } from 'react';
import { Activity, ExternalLink } from 'lucide-react';
import { fetchCompanyNews, type NewsArticle } from '../services/newsApi';

type Props = {
  companyName: string;
};

function badgeStyle(sentiment: NewsArticle['sentiment']) {
  if (sentiment === 'Bullish') {
    return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
  }
  if (sentiment === 'Bearish') {
    return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
  }
  return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
}

function gaugeColor(score: number) {
  if (score >= 65) return '#DC2626';
  if (score >= 40) return '#EA580C';
  return '#16A34A';
}

export default function NewsIntelligenceCard({ companyName }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [riskScore, setRiskScore] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadNews() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchCompanyNews(companyName);
        if (!active) return;
        setArticles(data.articles || []);
        setRiskScore(Number(data.external_risk_score || 0));
      } catch (e: any) {
        if (!active) return;
        setError(e?.userMessage || e?.message || 'Unable to fetch company news right now.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNews();
    return () => {
      active = false;
    };
  }, [companyName]);

  const aggregateSentiment = useMemo(() => {
    if (!articles.length) return 'Neutral';
    let score = 0;
    for (const a of articles) {
      if (a.sentiment === 'Bullish') score += 1;
      if (a.sentiment === 'Bearish') score -= 1;
    }
    if (score > 0) return 'Bullish';
    if (score < 0) return 'Bearish';
    return 'Neutral';
  }, [articles]);

  const color = gaugeColor(riskScore);

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, background: 'white', padding: '1rem 1.25rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 800, color: '#1E3A8A' }}>
            <Activity size={18} /> News Intelligence Feed
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>{companyName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065F46', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 6px rgba(16,185,129,0.15)' }} />
          LIVE
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.9rem', background: '#F8FAFC' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>News Risk Signal</div>
          <div style={{ marginTop: 8, fontSize: '1.8rem', fontWeight: 800, color }}>{riskScore.toFixed(1)}<span style={{ fontSize: '0.9rem', color: '#64748B' }}>/100</span></div>
          <div style={{ marginTop: 4, fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Aggregate Sentiment: {aggregateSentiment}</div>
          <div style={{ marginTop: 10, height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, riskScore))}%`, background: color, transition: 'width 0.35s ease' }} />
          </div>
        </div>

        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ maxHeight: 260, overflowY: 'auto', padding: '0.4rem 0.6rem' }}>
            {loading && <div style={{ padding: '1rem', color: '#64748B', fontWeight: 600 }}>Fetching live headlines...</div>}
            {!loading && error && <div style={{ padding: '1rem', color: '#B91C1C', fontWeight: 600 }}>{error}</div>}
            {!loading && !error && !articles.length && <div style={{ padding: '1rem', color: '#64748B' }}>No news articles found for this company.</div>}

            {!loading && !error && articles.map((item, idx) => {
              const s = badgeStyle(item.sentiment);
              return (
                <div key={`${item.headline}-${idx}`} style={{ padding: '0.75rem 0.5rem', borderBottom: idx < articles.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>{item.headline}</div>
                      <div style={{ marginTop: 5, fontSize: '0.78rem', color: '#64748B' }}>
                        {item.source}{item.published ? ` • ${String(item.published).slice(0, 10)}` : ''}
                      </div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: 999, border: `1px solid ${s.border}`, background: s.bg, color: s.text, fontSize: '0.72rem', fontWeight: 800 }}>
                      {item.sentiment}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748B' }}>
                    <span>Risk Impact: <strong style={{ color: '#334155' }}>{item.risk_impact_score.toFixed(1)}</strong></span>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
                        Open <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
