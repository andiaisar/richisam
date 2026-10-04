import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Request interceptor: sisipkan token JWT ke setiap request
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: tangani error 401 (Unauthorized)
const PUBLIC_PAGES = ['/login', '/register'];

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.startsWith('/auth');
    const isOnPublicPage = PUBLIC_PAGES.includes(window.location.pathname);

    // Redirect hanya jika sesi kadaluarsa di halaman terlindungi.
    // 401 dari /auth (mis. password salah) atau di halaman publik dibiarkan
    // agar komponen bisa menampilkan pesan error-nya sendiri.
    if (error.response?.status === 401 && !isAuthRequest && !isOnPublicPage) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;
