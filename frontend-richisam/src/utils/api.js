// src/utils/api.js
// Re-export instance axios yang sudah dikonfigurasi lengkap dari src/api/axios.js
// (baseURL, JWT interceptor, dan auto-redirect jika token expired sudah ada di sana)
import api from '../api/axios';

export default api;
