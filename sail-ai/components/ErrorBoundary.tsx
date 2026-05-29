'use client'

/**
 * ErrorBoundary — M-2: Global React error boundary.
 * Wraps the entire application tree so a single component crash
 * never propagates to a white screen of death.
 *
 * Usage (in layout.tsx):
 *   <ErrorBoundary>
 *     {children}
 *   </ErrorBoundary>
 */

import React from 'react'

interface Props {
  children: React.ReactNode
  /** Optional custom fallback UI. Defaults to the built-in recovery screen. */
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error:    Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // M-7: Structured error logging — replace with Sentry.captureException(error, { extra: info }) in production
    console.error('[ErrorBoundary] Uncaught render error:', {
      message:        error.message,
      stack:          error.stack,
      componentStack: info.componentStack,
      timestamp:      new Date().toISOString(),
    })
    this.setState({ errorInfo: info })
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    // Built-in graceful degradation UI — matches Aetheris design language
    return (
      <div
        role="alert"
        style={{
          minHeight:       '100dvh',
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '2rem',
          background:      '#0C0C0E',
          fontFamily:      'Inter, sans-serif',
          textAlign:       'center',
          gap:             '1.5rem',
        }}
      >
        {/* Gold sail rule */}
        <div style={{ width: 40, height: 2, background: '#C9A96E', borderRadius: 1 }} />

        <div>
          <p style={{
            fontSize:      '0.6rem',
            fontWeight:    700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         '#C9A96E',
            margin:        '0 0 0.75rem',
          }}>
            SAIL AI — SYSTEM ALERT
          </p>
          <h1 style={{
            fontFamily:   'Cormorant Garamond, serif',
            fontStyle:    'italic',
            fontSize:     'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight:   600,
            color:        '#FAFAF8',
            margin:       '0 0 0.5rem',
            lineHeight:   1.15,
          }}>
            An unexpected error occurred.
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#71717A', margin: 0, maxWidth: 440, lineHeight: 1.6 }}>
            The application encountered an unrecoverable error. Your session data has been preserved.
            Use the options below to recover.
          </p>
        </div>

        {/* Error detail (dev-only detail) */}
        {process.env.NODE_ENV !== 'production' && this.state.error && (
          <details style={{
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding:      '0.75rem 1rem',
            maxWidth:     520,
            width:        '100%',
            textAlign:    'left',
          }}>
            <summary style={{ fontSize: '0.72rem', color: '#C9A96E', cursor: 'pointer', userSelect: 'none' }}>
              Error details (dev only)
            </summary>
            <pre style={{ fontSize: '0.65rem', color: '#EF4444', marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack?.slice(0, 800)}
            </pre>
          </details>
        )}

        {/* Recovery actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={this.handleReset}
            style={{
              padding:      '0.6rem 1.5rem',
              background:   'transparent',
              border:       '1.5px solid rgba(201,169,110,0.5)',
              borderRadius: 8,
              color:        '#C9A96E',
              fontFamily:   'Inter, sans-serif',
              fontSize:     '0.82rem',
              fontWeight:   600,
              cursor:       'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Try Again
          </button>
          <button
            onClick={this.handleReload}
            style={{
              padding:      '0.6rem 1.5rem',
              background:   '#C9A96E',
              border:       'none',
              borderRadius: 8,
              color:        '#0C0C0E',
              fontFamily:   'Inter, sans-serif',
              fontSize:     '0.82rem',
              fontWeight:   700,
              cursor:       'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Reload Page →
          </button>
        </div>

        <div style={{ width: 40, height: 2, background: '#C9A96E', borderRadius: 1, opacity: 0.3 }} />
      </div>
    )
  }
}
