import { create } from 'zustand';
import { api } from '@/lib/axios';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  department?: string;
  position?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);

    // Fetch user data after login
    await useAuthStore.getState().fetchCurrentUser();
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const response = await api.get('/auth/me');
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('access_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));