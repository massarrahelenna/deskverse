import { create } from "zustand";

interface AuthUser {
  id:          string;
  displayName: string;
  avatarUrl:   string | null;
  email:       string | null;
}

interface AuthState {
  user:      AuthUser | null;
  loading:   boolean;
  checkAuth: () => Promise<void>;
  logout:    () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  loading: true,

  async checkAuth() {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as AuthUser;
        set({ user: data, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch {
      set({ user: null, loading: false });
    }
  },

  async logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    set({ user: null });
  },
}));
