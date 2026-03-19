import axios from 'axios';
import { API_BASE_URL } from '../config/env';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getPortfolio = async () => {
  const response = await apiClient.get('/analyze/portfolio');
  return response.data;
};

export const getTickerAnalysis = async (ticker: string) => {
  const response = await apiClient.get(`/analyze/${ticker}`);
  return response.data;
};
