/**
 * stores/userStore.ts — User Domain Store
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for client-side user state:
 *   • profile (name, email, avatar)
 *   • subscription / pro status
 *   • preferences (language, business mode, theme)
 *   • BYOK Groq key (client-side only — never sent server-side)
 *
 * NOTE: BYOK key is stored in localStorage via zustand/persist.
 *       It never touches the server — validated client-side before use.
 */

import { create }               from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Theme    = 'dark' | 'light' | 'system'
export type Language = 'en' | 'tr' | 'de' | 'fr' | 'es' | 'pt' | 'ar' | 'zh' | 'ja'

export interface UserProfile {
  email:     string
  name:      string
  avatarUrl: string | null
}

export interface UserPreferences {
  language:     Language
  businessMode: boolean
  theme:        Theme
  agentMode:    string   // e.g. 'default', 'concise', 'detailed'
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface UserState {
  profile:      UserProfile | null
  isPro:        boolean
  trialEndsAt:  number | null   // Unix ms, null = not in trial
  preferences:  UserPreferences

  // BYOK — Groq API key, client-side only
  groqApiKey:   string

  // ── Actions ─────────────────────────────────────────────────────────────

  setProfile:     (p: UserProfile | null) => void
  setIsPro:       (v: boolean)            => void
  setTrialEndsAt: (ts: number | null)     => void
  setGroqApiKey:  (key: string)           => void
  setPreference:  <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void
  resetUser:      () => void
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: UserPreferences = {
  language:     'en',
  businessMode: false,
  theme:        'dark',
  agentMode:    'default',
}

// ── Store (persisted for prefs + groqApiKey) ──────────────────────────────────

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile:     null,
      isPro:       false,
      trialEndsAt: null,
      preferences: DEFAULT_PREFS,
      groqApiKey:  '',

      setProfile:     (p)         => set({ profile: p }),
      setIsPro:       (v)         => set({ isPro: v }),
      setTrialEndsAt: (ts)        => set({ trialEndsAt: ts }),
      setGroqApiKey:  (key)       => set({ groqApiKey: key.trim() }),

      setPreference: (key, value) => set(s => ({
        preferences: { ...s.preferences, [key]: value },
      })),

      resetUser: () => set({
        profile:     null,
        isPro:       false,
        trialEndsAt: null,
        preferences: DEFAULT_PREFS,
        groqApiKey:  '',
      }),
    }),
    {
      name:    'sail-ai-user',
      storage: createJSONStorage(() => localStorage),
      // Only persist preferences + groqApiKey — profile comes from session
      partialize: (s) => ({
        preferences: s.preferences,
        groqApiKey:  s.groqApiKey,
      }),
    }
  )
)

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectProfile     = (s: UserState) => s.profile
export const selectIsPro       = (s: UserState) => s.isPro
export const selectPreferences = (s: UserState) => s.preferences
export const selectGroqApiKey  = (s: UserState) => s.groqApiKey
export const selectLanguage    = (s: UserState) => s.preferences.language
export const selectIsInTrial   = (s: UserState) =>
  s.trialEndsAt !== null && s.trialEndsAt > Date.now()
