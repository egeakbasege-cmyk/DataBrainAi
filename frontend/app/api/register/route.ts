import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password } = body

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 })
  }

  try {
    const res = await fetch(`${BACKEND}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || 'Registration failed.' },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Register fetch error:', err, 'BACKEND_URL:', BACKEND)
    return NextResponse.json(
      { error: 'Could not reach server. Please try again.' },
      { status: 502 }
    )
  }
}
