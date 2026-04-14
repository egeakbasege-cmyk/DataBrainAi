'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Locale, TranslationKey } from './translations'
import { t as translate, LOCALES } from './translations'

const STORAGE_KEY = 'sail_locale'

interface LanguageContextValue {
  locale:   Locale
  setLocale: (l: Locale) => void
  t:        (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  locale:    'en',
  setLocale: () => undefined,
  t:         (key) => key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Hydrate from localStorage on mount; fall back to browser language
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored && LOCALES.some(l => l.code === stored)) {
        setLocaleState(stored)
        return
      }
      // Auto-detect from browser
      const browser = navigator.language.slice(0, 2) as Locale
      if (LOCALES.some(l => l.code === browser)) {
        setLocaleState(browser)
      }
    } catch { /* SSR / private browsing */ }
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* ignore */ }
  }

  const t = (key: TranslationKey) => translate(locale, key)

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
