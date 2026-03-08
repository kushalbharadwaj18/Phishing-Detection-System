import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  register: (name, email, password) =>
    apiClient.post('/auth/register', { name, email, password }),
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
};

export const detectionAPI = {
  analyze: (url) => apiClient.post('/detection/analyze', { url }),
  getHistory: (limit = 20, page = 1) =>
    apiClient.get(`/detection/history?limit=${limit}&page=${page}`),
  getAnalysisDetails: (id) => apiClient.get(`/detection/${id}`),
  getStats: () => apiClient.get('/detection/stats/overview'),
};

export default apiClient;
