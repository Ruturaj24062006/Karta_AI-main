import api from './apiConfig';

export type NewsArticle = {
  headline: string;
  source: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  risk_impact_score: number;
  link?: string;
  published?: string;
};

export type NewsIntelligenceResponse = {
  company_name: string;
  external_risk_score: number;
  critical_negative_event: boolean;
  articles: NewsArticle[];
};

export async function fetchCompanyNews(companyName: string): Promise<NewsIntelligenceResponse> {
  const encoded = encodeURIComponent(companyName);
  const res = await api.get<NewsIntelligenceResponse>(`/news/${encoded}`);
  return res.data;
}
