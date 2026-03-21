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
  const sessionHoldings = sessionStorage.getItem('uploaded_holdings');
  if (sessionHoldings && sessionHoldings !== "undefined") {
    try {
      const sessionSummary = sessionStorage.getItem('portfolio_summary');
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
      sessionStorage.removeItem('uploaded_holdings');
    }
  }

  const cacheKey = 'decixn_portfolio';
  const cacheTimeKey = 'decixn_portfolio_time';
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
      current_value: h.holding_context.current_value,
      pnl: h.holding_context.current_pnl,
    })),
  };
  const response = await apiClient.post('/analyze/portfolio', payload);
  return response.data;
};
