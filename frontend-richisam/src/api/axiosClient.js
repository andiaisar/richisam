import axios from 'axios';
import Cookies from 'js-cookie';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const reqUrl = error.config?.url || '';
    if (error.response?.status === 401 && !reqUrl.includes('/auth/login')) {
      sessionStorage.removeItem('token');
      Cookies.remove('token');
      // Redirect to login handled by protected route/zustand
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
