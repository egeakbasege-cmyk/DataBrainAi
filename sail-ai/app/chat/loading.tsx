import { Logo } from '@/components/Logo'

export default function ChatLoading() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0A0F1E' }}
    >
      <div className="flex flex-col items-center gap-4">
        <Logo size={32} />
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(192,57,43,0.3)', borderTopColor: '#C0392B' }}
        />
      </div>
    </main>
  )
}
