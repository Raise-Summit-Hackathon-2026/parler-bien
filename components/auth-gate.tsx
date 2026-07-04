"use client"

import { LogOut } from "lucide-react"
import { type FormEvent, type ReactNode, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

type User = {
  id: string
  email: string
}

type AuthMode = "login" | "register"

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user: User | null }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSubmitting(true)

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = (await response.json()) as { user?: User; error?: string }

    setSubmitting(false)
    if (!response.ok || !data.user) {
      setError(data.error ?? "Authentication failed")
      return
    }

    setUser(data.user)
    setPassword("")
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    setPassword("")
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/30 px-6 py-10">
        <section className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Parler Bien
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "login" ? "Sign in" : "Create account"}
            </h1>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm font-medium">
              <span>Email</span>
              <input
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Password</span>
              <input
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Please wait"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <Button
            className="mt-4 w-full"
            variant="ghost"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login")
              setError("")
            }}
          >
            {mode === "login"
              ? "Create a new account"
              : "I already have an account"}
          </Button>
        </section>
      </main>
    )
  }

  return (
    <>
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-sm backdrop-blur">
        <span className="max-w-[38vw] truncate text-muted-foreground">
          {user.email}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut />
        </Button>
      </div>
      {children}
    </>
  )
}
