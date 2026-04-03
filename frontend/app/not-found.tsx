import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: '#F5F5F7' }}>
      <div className="text-center max-w-sm animate-fade-up space-y-6">

        <div className="editorial-number" style={{ color: 'rgba(0,0,0,0.06)', fontSize: '8rem', lineHeight: 1 }}>
          404
        </div>

        <div className="-mt-8 space-y-2">
          <p className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2">Not found</p>
          <h1 className="font-heading font-bold text-ink text-2xl">
            This page doesn't exist.
          </h1>
          <p className="font-sans text-sm text-dim">
            The URL you visited doesn't match any page in this application.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/analyse"
            className="font-heading font-bold text-ink text-sm px-6 py-3 rounded-pill transition-all glow-yellow"
            style={{ background: '#FACC15' }}>
            Start analysing
          </Link>
          <Link href="/"
            className="font-sans text-sm px-6 py-3 rounded-pill border border-border bg-card text-dim hover:text-ink transition-all">
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
