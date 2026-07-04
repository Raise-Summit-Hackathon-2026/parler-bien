"use client"

import { type FormEvent, type ReactNode, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

type AuthMode = "login" | "register"

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    const supabase = getSupabaseBrowserClient()

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setUser(data.session?.user ?? null)
        }
      })
      .catch(() => {
        if (mounted) setUser(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    setSubmitting(true)

    const supabase = getSupabaseBrowserClient()
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setSubmitting(false)
    if (result.error) {
      setError(result.error.message)
      return
    }

    if (result.data.user && !result.data.session) {
      setNotice("Check your email to confirm the account, then sign in.")
    }

    setUser(result.data.session?.user ?? null)
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
            {notice && (
              <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                {notice}
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
              setNotice("")
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
      {children}
    </>
  )
}
