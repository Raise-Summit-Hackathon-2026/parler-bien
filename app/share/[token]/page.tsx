"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { AuthGate } from "@/components/auth-gate"
import { CinematicPageShell } from "@/components/cinematic-page-shell"
import { joinWorkspaceViaToken } from "@/lib/character-db"

export default function ShareJoinPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    joinWorkspaceViaToken(params.token)
      .then((workspaceId) => router.replace(`/workspaces/${workspaceId}`))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to join workspace"),
      )
  }, [params.token, router])

  return (
    <AuthGate>
      <CinematicPageShell contentClassName="min-h-[60vh] items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-3xl border bg-card/95 p-8 text-center shadow-2xl shadow-black/10 ring-1 ring-border/50 dark:border-white/10 dark:bg-white/3 dark:shadow-black/50 dark:ring-white/5">
        {error ? (
          <>
            <p className="text-xs font-semibold tracking-[0.18em] text-lime-700 uppercase dark:text-lime-300">
              Invite link
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Could not join workspace</h1>
            <p className="text-sm text-destructive">{error}</p>
            <Link
              href="/workspaces"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-lime-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-lime-700 dark:bg-lime-300 dark:text-black dark:hover:bg-lime-200"
            >
              Back to workspaces
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="size-6 animate-spin text-lime-700 dark:text-lime-300" />
            <p className="text-xs font-semibold tracking-[0.18em] text-lime-700 uppercase dark:text-lime-300">
              Invite link
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Joining workspace...</h1>
            <p className="text-sm text-muted-foreground dark:text-white/55">
              We’ll redirect you as soon as the invite is accepted.
            </p>
          </>
        )}
      </div>
      </CinematicPageShell>
    </AuthGate>
  )
}
