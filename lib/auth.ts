import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto"
import { promisify } from "util"

import { cookies } from "next/headers"

import { query } from "@/lib/db"

const scrypt = promisify(scryptCallback)

const SESSION_COOKIE = "parler_bien_session"
const SESSION_DAYS = 14
const PASSWORD_MIN_LENGTH = 8

export type AuthUser = {
  id: string
  email: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url")
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url")
  const derived = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt:${salt}:${derived.toString("base64url")}`
}

async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split(":")
  if (algorithm !== "scrypt" || !salt || !storedHash) return false

  const stored = Buffer.from(storedHash, "base64url")
  const derived = (await scrypt(password, salt, stored.length)) as Buffer

  return stored.length === derived.length && timingSafeEqual(stored, derived)
}

function validateCredentials(
  email: string,
  password: string
): { email: string } | { error: string } {
  const normalizedEmail = normalizeEmail(email)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { error: "Enter a valid email address" }
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    }
  }

  return { email: normalizedEmail }
}

export async function registerUser(email: string, password: string) {
  const validation = validateCredentials(email, password)
  if ("error" in validation) return validation

  const passwordHash = await hashPassword(password)
  const id = randomUUID()

  try {
    const result = await query<AuthUser>(
      `
        insert into users (id, email, password_hash)
        values ($1, $2, $3)
        returning id, email
      `,
      [id, validation.email, passwordHash]
    )

    return { user: result.rows[0] }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return { error: "An account already exists for this email" }
    }

    throw error
  }
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)
  const result = await query<AuthUser & { password_hash: string }>(
    "select id, email, password_hash from users where email = $1",
    [normalizedEmail]
  )
  const user = result.rows[0]

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Email or password is incorrect" }
  }

  return { user: { id: user.id, email: user.email } }
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url")
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await query(
    "insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)",
    [tokenHash, userId, expiresAt]
  )

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    await query("delete from sessions where token_hash = $1", [
      hashToken(token),
    ])
  }

  cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const result = await query<AuthUser>(
    `
      select users.id, users.email
      from sessions
      join users on users.id = sessions.user_id
      where sessions.token_hash = $1
        and sessions.expires_at > now()
    `,
    [hashToken(token)]
  )

  return result.rows[0] ?? null
}

export async function requireCurrentUser() {
  const user = await getCurrentUser()
  if (!user) return { error: "Authentication required" as const }

  return { user }
}
