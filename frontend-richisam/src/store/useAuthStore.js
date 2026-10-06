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
      Cookies.set('token', data.token, { expires: 1 });
      set({ user: data.user, isAuthenticated: true });
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

  checkAuth: async () => {
    const token = Cookies.get('token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    
    try {
      // Assuming you have a /auth/me endpoint. If not, we might need to decode JWT or use another endpoint
      // For now, let's just decode it or rely on a generic check. Since we don't have /auth/me built yet,
      // let's rely on the token presence for initial state, but ideally we should fetch user data.
      // Wait, let's create /api/auth/me later if needed. For now, decode JWT.
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const user = JSON.parse(jsonPayload);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      Cookies.remove('token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));

export default useAuthStore;
