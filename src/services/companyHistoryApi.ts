import api from './apiConfig';

export interface CompanyHistoryItem {
  id: number;
  company_name: string;
  cin_number: string;
  gstin_number: string;
  analysis_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  last_checked: string;
}

export async function fetchCompanyHistory(): Promise<CompanyHistoryItem[]> {
  try {
    const response = await api.get<CompanyHistoryItem[]>('/admin/company-history');
    return response.data || [];
  } catch (error) {
    throw error;
  }
}
