"use client"

import { LogOut } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const supabase = getSupabaseBrowserClient()

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setUser(data.session?.user ?? null)
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

  async function handleLogout() {
    await getSupabaseBrowserClient().auth.signOut()
    setUser(null)
  }

  if (loading) {
    return <span className="text-xs text-muted-foreground">…</span>
  }

  if (!user) {
    return (
      <Link
        href="/workspaces"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[12rem] truncate text-xs text-muted-foreground sm:inline">
        {user.email ?? "Signed in"}
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
  )
}
