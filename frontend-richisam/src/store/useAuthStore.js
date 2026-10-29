import { create } from 'zustand';
import axiosClient from '../api/axiosClient';
import Cookies from 'js-cookie';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    try {
      const data = await axiosClient.post('/auth/login', { username, password });
      Cookies.set('token', data.data.token, { expires: 1 });
      set({ user: data.data.user, isAuthenticated: true });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login gagal' 
      };
    }
  },

  logout: () => {
    Cookies.remove('token');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updatedData) => {
    set((state) => ({ user: state.user ? { ...state.user, ...updatedData } : null }));
  },

  checkAuth: async () => {
    const token = Cookies.get('token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const decoded = JSON.parse(jsonPayload);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        Cookies.remove('token');
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      set({ user: decoded, isAuthenticated: true, isLoading: false });

      // Verifikasi status aktif & sinkronisasi data terbaru dari server
      try {
        const res = await axiosClient.get('/auth/me');
        if (res?.data?.data) {
          set({ user: res.data.data, isAuthenticated: true, isLoading: false });
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
          Cookies.remove('token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    } catch {
      Cookies.remove('token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));

export default useAuthStore;
