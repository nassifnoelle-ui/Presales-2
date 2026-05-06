import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(process.env.APP_SECRET || 'emaratech-presales-2026')

export async function POST(req: NextRequest) {
  const { password, action } = await req.json()

  if (action === 'logout') {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete('em_session')
    return res
  }

  const appPassword = process.env.APP_PASSWORD || 'emaratech2026'
  if (password !== appPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const token = await new SignJWT({ role: 'presales' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(SECRET)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('em_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
    path: '/',
  })
  return res
}
