/**
 * src/stores/authStore.ts
 *
 * Zustand auth store — persisted to sessionStorage.
 * Tokens are NOT stored in localStorage (XSS mitigation).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  accessToken:   string | null
  refreshToken:  string | null
  userEmail:     string | null
  userRole:      string | null
  setTokens:     (access: string, refresh: string) => void
  setUser:       (email: string, role: string) => void
  logout:        () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:  null,
      refreshToken: null,
      userEmail:    null,
      userRole:     null,

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),

      setUser: (email, role) =>
        set({ userEmail: email, userRole: role }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, userEmail: null, userRole: null }),
    }),
    {
      name:    'sail-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        accessToken:  s.accessToken,
        refreshToken: s.refreshToken,
        userEmail:    s.userEmail,
        userRole:     s.userRole,
      }),
    },
  ),
)
