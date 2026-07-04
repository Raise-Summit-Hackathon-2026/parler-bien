import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js"

let browserClient: SupabaseClient | null = null

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  }

  return url
}

function getSupabaseKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured")
  }

  return key
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(getSupabaseUrl(), getSupabaseKey())
  }

  return browserClient
}

export function getSupabaseServerClient() {
  return createClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function getSupabaseAccessToken() {
  const {
    data: { session },
  } = await getSupabaseBrowserClient().auth.getSession()

  return session?.access_token ?? null
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const token = await getSupabaseAccessToken()
  const headers = new Headers(init.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(input, { ...init, headers })
}

export async function requireCurrentUser(
  request: Request
): Promise<{ user: User } | { error: string }> {
  const authorization = request.headers.get("authorization")
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null

  if (!token) {
    return { error: "Authentication required" }
  }

  const {
    data: { user },
    error,
  } = await getSupabaseServerClient().auth.getUser(token)

  if (error || !user) {
    return { error: "Authentication required" }
  }

  return { user }
}
