import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL

export async function POST(req: NextRequest) {
  // Fail fast with a clear message if BACKEND_URL isn't configured
  if (!BACKEND) {
    console.error('[register] BACKEND_URL env variable is not set.')
    return NextResponse.json(
      { error: 'Server configuration error. Contact support.' },
      { status: 503 }
    )
  }

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 })
  }

  try {
    const res = await fetch(`${BACKEND}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
      signal:  AbortSignal.timeout(10_000),
    })

    const data = await res.json()

    if (!res.ok) {
      const detail = data.detail
      const errMsg =
        typeof detail === 'string'   ? detail :
        Array.isArray(detail)        ? (detail[0]?.msg || 'Registration failed.') :
        detail?.message              ? detail.message :
        typeof data.error === 'string' ? data.error :
        'Registration failed.'
      return NextResponse.json({ error: errMsg }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    // ECONNREFUSED or timeout → backend unreachable
    const isNetworkError = err?.code === 'ECONNREFUSED' ||
      err?.name === 'TimeoutError' ||
      err?.cause?.code === 'ECONNREFUSED'

    if (isNetworkError) {
      console.error('[register] Cannot reach backend:', BACKEND, err?.message)
      return NextResponse.json(
        { error: 'Cannot reach server. Please try again in a moment.' },
        { status: 503 }
      )
    }

    console.error('[register] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Unexpected error. Please try again.' },
      { status: 502 }
    )
  }
}
