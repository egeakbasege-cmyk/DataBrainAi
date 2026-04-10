import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'
import { RegisterRequestSchema }     from '@/schema/analysis'
import { handleApiError }            from '@/utils/api-error'

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Zod validation (schema enforces min-lengths, email format, etc.)
    const body      = await req.json().catch(() => { throw Object.assign(new Error('INVALID_JSON'), { statusCode: 400 }) })
    const validated = RegisterRequestSchema.parse(body)
    const { email, password, name } = validated

    // 2. Uniqueness check
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { statusCode: 409, errorCode: 'EMAIL_IN_USE', message: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    // 3. Hash password with argon2 (dynamic import keeps it out of Edge bundles)
    const argon2         = await import('argon2')
    const hashedPassword = await argon2.hash(password)

    // 4. Create user
    await prisma.user.create({
      data: { email, name, password: hashedPassword },
    })

    return NextResponse.json({ success: true }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}
