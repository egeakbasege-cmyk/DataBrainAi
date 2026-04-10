import { NextResponse } from 'next/server'
import { ZodError }     from 'zod'

// ── Canonical error shape ──────────────────────────────────────────
export type ApiErrorPayload = {
  statusCode: number
  errorCode:  string
  message:    string
  details?:   unknown
}

// ── Named error class for intentional throws inside routes ─────────
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode:  string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Master error handler — drop this in every route's catch block ──
export function handleApiError(error: unknown): NextResponse<ApiErrorPayload> {
  // 1. Zod validation failures → 400 with field-level detail
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        statusCode: 400,
        errorCode:  'VALIDATION_ERROR',
        message:    'Invalid data provided.',
        details:    error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  // 2. Intentional ApiError throws from route logic
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        statusCode: error.statusCode,
        errorCode:  error.errorCode,
        message:    error.message,
      },
      { status: error.statusCode },
    )
  }

  // 3. Prisma known errors (P2002 = unique constraint, P2025 = not found)
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error
  ) {
    const code = (error as { code: string }).code
    if (code === 'P2002') {
      return NextResponse.json(
        { statusCode: 409, errorCode: 'CONFLICT', message: 'A record with this value already exists.' },
        { status: 409 },
      )
    }
    if (code === 'P2025') {
      return NextResponse.json(
        { statusCode: 404, errorCode: 'NOT_FOUND', message: 'The requested record was not found.' },
        { status: 404 },
      )
    }
  }

  // 4. Unexpected server error — log, never expose internals
  console.error('[API_ERROR]', error)
  return NextResponse.json(
    {
      statusCode: 500,
      errorCode:  'INTERNAL_SERVER_ERROR',
      message:    'An unexpected error occurred. Our engineers have been notified.',
    },
    { status: 500 },
  )
}
