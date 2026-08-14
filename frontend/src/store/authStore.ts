import { create } from 'zustand';
import api from '../lib/api';
import { getUser, setUser as setLocalUser, logout as authLogout } from '../lib/auth';

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  setUser: (user: any) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getUser(),
  isAuthenticated: !!getUser(),
  isLoading: false,
  isAdmin: getUser()?.role === 'ADMIN',
  setUser: (user) => {
    setLocalUser(user);
    set({ user, isAuthenticated: true, isAdmin: user.role === 'ADMIN' });
  },
  logout: () => {
    authLogout();
    set({ user: null, isAuthenticated: false, isAdmin: false });
  },
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/auth/me');
      setLocalUser(res.data);
      set({ user: res.data, isAuthenticated: true, isAdmin: res.data.role === 'ADMIN', isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isAdmin: false, isLoading: false });
    }
  },
}));
