import { NextRequest, NextResponse } from 'next/server'
import { verifyCredentials, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, password } = body as { username: string; password: string }

  if (!username || !password) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 400 })
  }

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
  }

  await createSession(username)
  return NextResponse.json({ ok: true })
}
