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
  // bcrypt has a hard 72-byte limit — check byte length server-side
  // (handles unicode chars which may be >1 byte each)
  if (Buffer.byteLength(password, 'utf8') > 64) {
    return NextResponse.json(
      { error: 'Password must be shorter. Please use 64 characters or fewer.' },
      { status: 400 }
    )
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
      console.error('[register] backend error status:', res.status, 'body:', JSON.stringify(data))
      // Backend uses two error shapes:
      //   HTTPException  → { detail: "string" }
      //   Custom handler → { error: { code, message, correlation_id } }
      const detail = data.detail
      const errObj = data.error
      const errMsg =
        typeof detail === 'string'                          ? detail :
        Array.isArray(detail)                               ? (detail[0]?.msg || detail[0]?.message || 'Validation failed.') :
        detail?.message                                     ? String(detail.message) :
        typeof errObj === 'string'                          ? errObj :
        errObj?.message && typeof errObj.message === 'string' ? errObj.message :
        typeof data.message === 'string'                    ? data.message :
        res.status === 409                                 ? 'An account with this email already exists.' :
        res.status === 400                                 ? 'Invalid email or password format.' :
        res.status === 422                                 ? 'Invalid request. Check your details and try again.' :
        res.status >= 500                                  ? 'Server error. Please try again in a moment.' :
        'Registration failed. Please try again.'
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
