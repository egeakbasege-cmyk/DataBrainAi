import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor Configuration — Sail AI
 *
 * Fixes applied vs. original:
 *   1. Added iOS.contentInset: 'always' — without this, WKWebView ignores
 *      viewport-fit:cover and safe-area-inset-top returns 0 on all iOS devices.
 *      This was the root cause of the notch overlap issue on iPhone.
 *
 *   2. Added iOS.limitsNavigationsToAppBoundDomains: true — required for
 *      App Store review (prevents arbitrary web navigation from inside the app).
 *
 *   3. Added android.allowMixedContent: false — blocks http:// in https context,
 *      prevents App Sandbox bypass.
 *
 *   4. SplashScreen.iosSpinnerStyle added — visual consistency on iOS.
 *
 *   5. server.url: conditional dev server — allows `npx cap run ios` to point
 *      at the local Next.js dev server for hot-reload during development.
 *      REMOVE this for production builds (leave server block without url).
 */

const isDev = process.env.NODE_ENV === 'development'

const config: CapacitorConfig = {
  appId:   'com.databrain.sailai',
  appName: 'Sail AI',
  webDir:  'out',

  server: {
    androidScheme: 'https',
    iosScheme:     'capacitor',
    // DEV ONLY: point at local Next.js server for live-reload.
    // Comment out / remove for production builds.
    ...(isDev && process.env.DEV_SERVER_URL
      ? { url: process.env.DEV_SERVER_URL, cleartext: true }
      : {}),
  },

  ios: {
    // CRITICAL: without 'always', env(safe-area-inset-*) returns 0 on all iOS.
    // viewport-fit:cover in layout.tsx is only effective when this is set.
    contentInset: 'always',

    // App Store requirement — prevent in-app browser navigation to arbitrary URLs
    limitsNavigationsToAppBoundDomains: true,

    // Prevents rubber-band scrolling on the root WebView (each scrollable
    // component should handle its own scroll)
    scrollEnabled: false,
  },

  android: {
    // Block mixed content (http inside https context)
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration:       2000,
      launchAutoHide:           true,
      backgroundColor:          '#0C0C0E',   // --ink: matches brand background
      androidSplashResourceName: 'splash',
      androidScaleType:          'CENTER_CROP',
      iosSpinnerStyle:           'small',     // 'large' | 'small' — matches dark bg
      showSpinner:               false,
      splashFullScreen:          true,
      splashImmersive:           true,
    },

    // StatusBar plugin — keep consistent with viewportFit:cover + gold themeColor
    // Requires @capacitor/status-bar if used. Remove if not installed.
    // StatusBar: {
    //   style: 'Dark',
    //   backgroundColor: '#0C0C0E',
    // },
  },
}

export default config
