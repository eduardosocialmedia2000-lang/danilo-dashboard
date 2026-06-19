import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'dd_session'
const SESSION_DURATION_DAYS = 7

function getSecretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET não definido nas variáveis de ambiente')
  return new TextEncoder().encode(secret)
}

export interface User {
  username: string
}

// Usuários fixos — definidos via env vars no Vercel
// AUTH_USERS = "usuario1:senha1,usuario2:senha2"
function getUsers(): Record<string, string> {
  const raw = process.env.AUTH_USERS || ''
  const map: Record<string, string> = {}
  for (const pair of raw.split(',')) {
    const [u, p] = pair.trim().split(':')
    if (u && p) map[u.trim()] = p.trim()
  }
  return map
}

export function verifyCredentials(username: string, password: string): boolean {
  const users = getUsers()
  return !!users[username] && users[username] === password
}

export async function createSession(username: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .sign(getSecretKey())

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return { username: payload.username as string }
  } catch {
    return null
  }
}

// Versão para middleware (usa Request diretamente, sem cookies())
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecretKey())
    return true
  } catch {
    return false
  }
}
