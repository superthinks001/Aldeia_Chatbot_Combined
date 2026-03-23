import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ============================================
// CREATE AXIOS INSTANCE
// ============================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ============================================
// REQUEST INTERCEPTOR (Add Auth Token)
// ============================================

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aldeia_access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR (Auto Token Refresh)
// ============================================

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('aldeia_refresh_token');

      if (!refreshToken) {
        // No refresh token, redirect to login
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });

        const { tokens, user } = response.data;

        // Store new tokens
        localStorage.setItem('aldeia_access_token', tokens.accessToken);
        localStorage.setItem('aldeia_refresh_token', tokens.refreshToken);
        localStorage.setItem('aldeia_user', JSON.stringify(user));

        // Update authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;

        // Process queued requests
        processQueue(null, tokens.accessToken);

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError, null);
        localStorage.removeItem('aldeia_access_token');
        localStorage.removeItem('aldeia_refresh_token');
        localStorage.removeItem('aldeia_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// API METHODS
// ============================================

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  register: (email: string, password: string, name: string, county?: string) =>
    apiClient.post('/auth/register', { email, password, name, county }),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),

  getCurrentUser: () =>
    apiClient.get('/auth/me'),

  // Chat
  sendMessage: (message: string, context?: any) =>
    apiClient.post('/chat', { message, context }),

  getChatHistory: () =>
    apiClient.get('/chat/history'),

  searchDocuments: (query: string) =>
    apiClient.post('/chat/search', { query }),

  // Feature 2: Upload document in chat
  uploadChatDocument: (conversationId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);
    return apiClient.post('/chat/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Feature 3: Add URL for scraping in chat
  addChatUrl: (conversationId: string, url: string) =>
    apiClient.post('/chat/add-url', { url, conversationId }),

  // Generic request method
  request: (config: AxiosRequestConfig) =>
    apiClient.request(config)
};

export default api;
