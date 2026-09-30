import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('meetmind_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthorized / expired token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (localStorage.getItem('meetmind_token')) {
        localStorage.removeItem('meetmind_token');
        localStorage.removeItem('meetmind_user');
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // User Registration
  async register(data) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // User Login
  async login(data) {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  // Get current user profile
  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update profile
  async updateProfile(data) {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  // Change password
  async changePassword(data) {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  // Logout
  async logout() {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch {
      // Even if network fails, logout should proceed locally
      return { message: "Logged out successfully" };
    }
  },

  // Health check
  async checkHealth() {
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;
