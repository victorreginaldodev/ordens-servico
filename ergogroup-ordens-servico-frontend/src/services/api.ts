import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({baseURL: API_BASE_URL,});

api.interceptors.request.use((config) => {
    const isPublicAuth =
      config.url?.includes('/auth/login/') ||
      config.url?.includes('/auth/password/reset/');

    const token = localStorage.getItem('access_token');
    if (token && !isPublicAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
