export default function Loading() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <div className="space-y-2 w-48">
        <div className="skeleton h-1 rounded-full" />
        <div className="skeleton h-1 rounded-full w-3/4" />
        <div className="skeleton h-1 rounded-full w-1/2" />
      </div>
    </main>
  )
}
