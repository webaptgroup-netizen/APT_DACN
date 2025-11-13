import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';
import type { AuthUser } from '../types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error?: string;
  hydrated: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { hoTen: string; email: string; password: string; soDienThoai?: string }) => Promise<void>;
  fetchProfile: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      loading: false,
      hydrated: false,
      error: undefined,
      clearError() {
        set({ error: undefined });
      },
      setHydrated(value) {
        set({ hydrated: value });
      },
      async login(payload) {
        set({ loading: true, error: undefined });
        try {
          const { data } = await api.post('/auth/login', payload);
          set({ token: data.token, user: data.user, loading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.message ?? 'Ðang nh?p th?t b?i', loading: false });
          throw err;
        }
      },
      async register(payload) {
        set({ loading: true, error: undefined });
        try {
          const { data } = await api.post('/auth/register', payload);
          set({ token: data.token, user: data.user, loading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.message ?? 'Ðang ký th?t b?i', loading: false });
          throw err;
        }
      },
      async fetchProfile() {
        set({ loading: true });
        try {
          const { data } = await api.get('/auth/profile');
          set({
            user: {
              id: data.ID,
              hoTen: data.HoTen,
              email: data.Email,
              role: data.LoaiNguoiDung,
              soDienThoai: data.SoDienThoai
            },
            loading: false
          });
        } catch {
          set({ loading: false, token: null, user: null });
        }
      },
      logout() {
        set({ token: null, user: null });
      }
    }),
    {
      name: 'apt-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      }
    }
  )
);
