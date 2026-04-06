export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F7' }}>
      <div className="space-y-2 w-52">
        <div className="skeleton h-1.5 rounded-full" />
        <div className="skeleton h-1.5 rounded-full w-3/4" />
        <div className="skeleton h-1.5 rounded-full w-1/2" />
      </div>
    </main>
  )
}
