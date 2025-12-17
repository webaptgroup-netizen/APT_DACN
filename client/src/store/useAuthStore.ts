import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';
import type { AuthUser, UserRole } from '../types';

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
  setUser: (user: AuthUser | null) => void;
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeUserRole = (role: unknown): UserRole => {
  if (typeof role !== 'string') return 'Khach';
  const normalized = normalizeText(role);

  if (normalized === 'ban quan ly' || normalized === 'admin' || normalized === 'administrator') return 'Ban quan ly';
  if (normalized === 'cu dan' || normalized === 'resident') return 'Cu dan';
  if (normalized === 'khach' || normalized === 'guest' || normalized === 'customer') return 'Khach';

  return 'Khach';
};

const normalizeAuthUser = (input: unknown): AuthUser | null => {
  if (!input || typeof input !== 'object') return null;
  const user = input as Record<string, unknown>;

  const idValue = user.id ?? user.ID;
  const id = typeof idValue === 'number' ? idValue : typeof idValue === 'string' ? Number(idValue) : NaN;
  if (!Number.isFinite(id)) return null;

  const hoTenValue = user.hoTen ?? user.HoTen;
  const emailValue = user.email ?? user.Email;
  if (typeof hoTenValue !== 'string' || typeof emailValue !== 'string') return null;

  const roleValue = user.role ?? user.LoaiNguoiDung;
  const soDienThoaiValue = user.soDienThoai ?? user.SoDienThoai;
  const hinhAnhValue = user.hinhAnh ?? user.HinhAnh;

  return {
    id,
    hoTen: hoTenValue,
    email: emailValue,
    role: normalizeUserRole(roleValue),
    soDienThoai: typeof soDienThoaiValue === 'string' ? soDienThoaiValue : undefined,
    hinhAnh: typeof hinhAnhValue === 'string' ? hinhAnhValue : undefined
  };
};

const getApiErrorMessage = (err: unknown) => {
  const maybeError = err as {
    message?: unknown;
    response?: { data?: { message?: unknown } };
  };

  return (
    (typeof maybeError.response?.data?.message === 'string' ? maybeError.response?.data?.message : undefined) ??
    (typeof maybeError.message === 'string' ? maybeError.message : undefined)
  );
};

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
      setUser(user) {
        set({ user: user ? normalizeAuthUser(user) : null });
      },
      async login(payload) {
        set({ loading: true, error: undefined });
        try {
          const { data } = await api.post('/auth/login', payload);
          set({ token: data.token, user: normalizeAuthUser(data.user), loading: false });
        } catch (err: unknown) {
          set({ error: getApiErrorMessage(err) ?? 'Dang nhap that bai', loading: false });
          throw err;
        }
      },
      async register(payload) {
        set({ loading: true, error: undefined });
        try {
          const { data } = await api.post('/auth/register', payload);
          set({ token: data.token, user: normalizeAuthUser(data.user), loading: false });
        } catch (err: unknown) {
          set({ error: getApiErrorMessage(err) ?? 'Dang ky that bai', loading: false });
          throw err;
        }
      },
      async fetchProfile() {
        set({ loading: true });
        try {
          const { data } = await api.get('/auth/profile');
          set({ user: normalizeAuthUser(data), loading: false });
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
        if (state?.user) {
          state.setUser(state.user);
        }
      }
    }
  )
);
