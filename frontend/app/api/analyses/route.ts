import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL

export async function GET(req: NextRequest) {
  if (!BACKEND) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 503 })
  }
  const auth = req.headers.get('Authorization') || ''
  try {
    const res = await fetch(`${BACKEND}/api/analyses`, {
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Cannot reach server.' }, { status: 503 })
  }
}
