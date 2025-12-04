import type { AuthUser } from '../types';
interface AuthState {
    token: string | null;
    user: AuthUser | null;
    loading: boolean;
    error?: string;
    hydrated: boolean;
    login: (payload: {
        email: string;
        password: string;
    }) => Promise<void>;
    register: (payload: {
        hoTen: string;
        email: string;
        password: string;
        soDienThoai?: string;
    }) => Promise<void>;
    fetchProfile: () => Promise<void>;
    logout: () => void;
    clearError: () => void;
    setHydrated: (value: boolean) => void;
}
export declare const useAuthStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AuthState>, "setState" | "persist"> & {
    setState(partial: AuthState | Partial<AuthState> | ((state: AuthState) => AuthState | Partial<AuthState>), replace?: false | undefined): unknown;
    setState(state: AuthState | ((state: AuthState) => AuthState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AuthState, AuthState, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AuthState) => void) => () => void;
        onFinishHydration: (fn: (state: AuthState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AuthState, AuthState, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=useAuthStore.d.ts.map