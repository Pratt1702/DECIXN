import axios from 'axios';
import { API_BASE_URL } from '../config/env';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const MOCK_PORTFOLIO = {
  portfolio_summary: {
    health: "Weak", risk_level: "High", total_invested: 230071, total_value_live: 204832, total_pnl: -25239, win_rate: "20%",
    insight: "Majority of holdings are currently sitting at a loss but showing recovery signs. Keep an eye on Tata Steel support levels."
  },
  recommended_actions: [
    "Cut losses in deeply bearish stocks like Tata Steel to preserve capital if gap down occurs.",
    "Let your winners run. High confidence in Karnataka Bank breakout."
  ],
  portfolio_analysis: [
    { symbol: "tatapower", holding_context: { quantity: 200, avg_cost: 195.50, current_value: 0, pnl_pct: 0, current_pnl: 0 } },
    { symbol: "tcs", holding_context: { quantity: 15, avg_cost: 3850.00, current_value: 0, pnl_pct: 0, current_pnl: 0 } },
    { symbol: "Karnataka Bank", holding_context: { quantity: 100, avg_cost: 170.71, current_value: 23132, pnl_pct: 35.5, current_pnl: 6061 } },
    { symbol: "Coal India", holding_context: { quantity: 200, avg_cost: 450, current_value: 79000, pnl_pct: -12.22, current_pnl: -11000 } },
    { symbol: "Tata Steel", holding_context: { quantity: 100, avg_cost: 250, current_value: 15000, pnl_pct: -40.0, current_pnl: -10000 } },
    { symbol: "HDFC Bank", holding_context: { quantity: 50, avg_cost: 1600, current_value: 72500, pnl_pct: -9.37, current_pnl: -7500 } },
    { symbol: "Infosys", holding_context: { quantity: 10, avg_cost: 1800, current_value: 15200, pnl_pct: -15.55, current_pnl: -2800 } }
  ]
};

export const getPortfolio = async () => {
  // Priority 1: Check session storage for custom uploaded holdings
  const sessionHoldings = sessionStorage.getItem('uploaded_stock_holdings');
  if (sessionHoldings && sessionHoldings !== "undefined") {
    try {
      const sessionSummary = sessionStorage.getItem('stock_portfolio_summary');
      const summaryParsed = (sessionSummary && sessionSummary !== "undefined") 
        ? JSON.parse(sessionSummary) 
        : null;

      return {
        portfolio_analysis: JSON.parse(sessionHoldings),
        portfolio_summary: summaryParsed,
        is_manual: true
      };
    } catch (e) {
      console.warn("Session holdings corrupt, clearing:", e);
      sessionStorage.removeItem('uploaded_stock_holdings');
    }
  }

  const cacheKey = 'decixn_stock_portfolio';
  const cacheTimeKey = 'decixn_stock_portfolio_time';
  const cached = localStorage.getItem(cacheKey);
  const cacheTime = localStorage.getItem(cacheTimeKey);
  
  // Return cache if it's less than 5 minutes old (300,000ms) and has valid data
  if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 300000) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.portfolio_analysis && parsed.portfolio_analysis.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn("API cache corrupt, ignoring");
    }
  }
  
  try {
    const response = await apiClient.get('/analyze/portfolio');
    localStorage.setItem(cacheKey, JSON.stringify(response.data));
    localStorage.setItem(cacheTimeKey, Date.now().toString());
    return response.data;
  } catch (err) {
    if (cached) return JSON.parse(cached);
    console.warn("API failed, using highly resilient mock portfolio");
    return MOCK_PORTFOLIO;
  }
};

export const getTickerAnalysis = async (ticker: string) => {
  const response = await apiClient.get(`/analyze/${ticker}`);
  return response.data;
};

export const searchStocks = async (query: string) => {
  const response = await apiClient.get(`/search/${query}`);
  return response.data;
};

export const searchMF = async (query: string) => {
  const response = await apiClient.get(`/mf/search?q=${query}`);
  return response.data;
};

/**
 * Posts uploaded CSV holdings to the backend for live AI analysis.
 * Each element in `holdings` matches the shape stored in sessionStorage.
 */
export const analyzeCustomPortfolio = async (holdings: any[]) => {
  const payload = {
    holdings: holdings.map((h) => ({
      symbol: h.symbol,
      quantity: h.holding_context.quantity,
      avg_cost: h.holding_context.avg_cost,
      current_value: h.holding_context.current_value || 0,
      pnl: h.holding_context.current_pnl || 0,
    })),
  };
  const response = await apiClient.post('/analyze/portfolio', payload);
  return response.data;
};

export const analyzeMFPortfolio = async (holdings: any[]) => {
  const payload = {
    holdings: holdings.map((h) => ({
      symbol: h.scheme_name || h.symbol || "",
      isin: h.isin || h.holding_context?.isin || "",
      quantity: h.quantity || h.holding_context?.quantity || 0,
      avg_cost: h.avg_cost || h.holding_context?.avg_cost || 0,
      current_value: h.current_value || h.holding_context?.current_value || 0,
      pnl: h.current_pnl || h.holding_context?.current_pnl || 0,
    })),
  };
  const response = await apiClient.post('/mf/analyze/portfolio', payload);
  return response.data;
};

export const getMarketOverview = async () => {
  const response = await apiClient.get('/market/overview');
  return response.data;
};

export const getMFDetails = async (id: string) => {
  const response = await apiClient.get(`/mf/details/${id}`);
  return response.data;
};

export const analyzeMFInsights = async (holdings: any[], profile: any) => {
  const response = await apiClient.post("/mf/analyze/insights", { holdings, profile });
  return response.data;
};

export const getMFComparison = async (ids: string[]) => {
  const response = await apiClient.get(`/mf/compare?ids=${ids.join(',')}`);
  return response.data;
};

export const getBatchQuotes = async (symbols: string[]) => {
  const response = await apiClient.post('/quotes/batch', { symbols });
  return response.data;
};

// --- ALERTS ---

export const createAlert = async (alertData: { user_id: string; symbol: string; condition: any[] }) => {
  const response = await apiClient.post('/alerts', alertData);
  return response.data;
};

export const getAlerts = async (userId: string) => {
  const response = await apiClient.get(`/alerts/${userId}`);
  return response.data;
};

export const deleteAlert = async (alertId: string) => {
  const response = await apiClient.delete(`/alerts/${alertId}`);
  return response.data;
};

export const updateAlert = async (alertId: string, updateData: { is_active?: boolean; is_triggered?: boolean }) => {
  const response = await apiClient.patch(`/alerts/${alertId}`, updateData);
  return response.data;
};

export const runAlertsManually = async () => {
    const response = await apiClient.post('/alerts/run');
    return response.data;
}

// --- NOTIFICATIONS ---

export const getNotifications = async (userId: string) => {
  const response = await apiClient.get(`/notifications/${userId}`);
  return response.data;
};

export const markNotificationRead = async (notificationId: string) => {
  const response = await apiClient.post(`/notifications/read/${notificationId}`);
  return response.data;
};

// --- NEWS & RADAR ---

export const getNews = async (limit: number = 20, offset: number = 0) => {
  const response = await apiClient.get(`/news?limit=${limit}&offset=${offset}`);
  return response.data;
};

export const getOpportunityRadar = async (symbols?: string) => {
  const url = symbols ? `/opportunity-radar?symbols=${symbols}` : '/opportunity-radar';
  const response = await apiClient.get(url);
  return response.data;
};

