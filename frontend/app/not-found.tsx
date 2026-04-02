import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center max-w-sm animate-fade-up space-y-6">
        <div className="editorial-number" style={{ opacity: 0.04, fontSize: '12rem', lineHeight: 1 }}>404</div>
        <div className="-mt-16 space-y-3">
          <p className="font-mono text-2xs text-muted uppercase tracking-widest-2">Not found</p>
          <h1 className="font-heading text-ink" style={{ fontSize: '2rem', lineHeight: 1.1 }}>
            This page doesn't exist.
          </h1>
          <p className="font-sans text-dim text-sm" style={{ fontWeight: 300 }}>
            The URL you visited doesn't match any page in this application.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/analyse"
            className="font-mono text-sm px-6 py-3 rounded-pill transition-all glow-green"
            style={{ background: 'var(--green)', color: 'var(--bg)' }}>
            Start analysing
          </Link>
          <Link href="/"
            className="font-mono text-sm px-6 py-3 rounded-pill border border-border text-dim hover:text-ink transition-all">
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
