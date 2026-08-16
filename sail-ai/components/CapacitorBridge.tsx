'use client'

/**
 * Capacitor native bridge.
 *
 * Mounted once from the root layout. Every call is guarded by
 * `Capacitor.isNativePlatform()` so this component is completely inert on the
 * web build — the plugin modules are imported dynamically so their native
 * shims never end up in the browser bundle.
 *
 * Responsibilities:
 *   1. Hide the splash screen once React has hydrated (otherwise the splash
 *      stays until its timeout and the app feels slow).
 *   2. Match the status bar to the dark brand background.
 *   3. Make the Android hardware back button behave like a browser Back,
 *      and exit the app instead of leaving the user on a blank screen.
 */

import { useEffect } from 'react'

export function CapacitorBridge() {
  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform() || cancelled) return

        const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
          import('@capacitor/splash-screen'),
          import('@capacitor/status-bar'),
          import('@capacitor/app'),
        ])

        await SplashScreen.hide().catch(() => {})

        // The app renders on --canvas (#FAFAF8), a light surface, so the status
        // bar needs DARK glyphs. In Capacitor `Style.Light` means
        // "light background / dark text" — which is what we want here.
        await StatusBar.setStyle({ style: Style.Light }).catch(() => {})
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#FAFAF8' }).catch(() => {})
        }

        const handle = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) window.history.back()
          else App.exitApp()
        })

        cleanup = () => { handle.remove() }
      } catch {
        // Native plugins are unavailable on the web build — nothing to do.
      }
    })()

    return () => { cancelled = true; cleanup?.() }
  }, [])

  return null
}
