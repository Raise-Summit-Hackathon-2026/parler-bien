"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { AuthGate } from "@/components/auth-gate"
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <Link
              href="/workspaces"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to workspaces
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Joining workspace…</p>
          </>
        )}
      </div>
    </AuthGate>
  )
}
