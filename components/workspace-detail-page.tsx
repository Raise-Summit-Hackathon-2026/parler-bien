"use client"

import { ArrowLeft, Link2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { CharacterGrid } from "@/components/character-grid"
import { Button } from "@/components/ui/button"
import {
  createShareLink,
  deleteCharacter,
  getActiveShareLink,
  getWorkspace,
  listWorkspaceCharacters,
} from "@/lib/characters"
import type { CharacterRow, WorkspaceRow } from "@/lib/workspace-types"

type WorkspaceDetailPageProps = {
  workspaceId: string
}

export function WorkspaceDetailPage({ workspaceId }: WorkspaceDetailPageProps) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null)
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")

  const load = useCallback(async () => {
    const [ws, chars, token] = await Promise.all([
      getWorkspace(workspaceId),
      listWorkspaceCharacters(workspaceId),
      getActiveShareLink(workspaceId),
    ])
    setWorkspace(ws)
    setCharacters(chars)
    setShareToken(token)
  }, [workspaceId])

  useEffect(() => {
    load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load workspace"),
      )
      .finally(() => setBusy(false))
  }, [load])

  async function handleShare() {
    try {
      const token = shareToken ?? (await createShareLink(workspaceId))
      setShareToken(token)
      const url = `${window.location.origin}/share/${token}`
      await navigator.clipboard.writeText(url)
      setStatus("Invite link copied")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share link")
    }
  }

  async function handleDelete(characterId: string) {
    await deleteCharacter(characterId)
    setCharacters((current) => current.filter((c) => c.id !== characterId))
  }

  if (busy && !workspace) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading workspace
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-muted-foreground">Workspace not found.</p>
        <Link
          href="/workspaces"
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to workspaces
        </Link>
      </div>
    )
  }

  return (
    <main className="min-h-svh bg-muted/20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/workspaces"
              className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Workspaces
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">{workspace.name}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              {workspace.description ?? "Add characters for your team to practice together."}
            </p>
          </div>
          <Button variant="outline" onClick={() => void handleShare()}>
            <Link2 />
            Copy invite link
          </Button>
        </div>

        {(error || status) && (
          <p
            className={
              error
                ? "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                : "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
            }
          >
            {error || status}
          </p>
        )}

        <CharacterGrid
          builtInScenarios={[]}
          characters={characters}
          workspaceId={workspaceId}
          onSelect={({ characterId }) => {
            if (characterId) {
              router.push(
                `/workspaces/${workspaceId}/play/${characterId}`,
              )
            }
          }}
          onCharacterCreated={(character) =>
            setCharacters((current) => [character, ...current])
          }
          onCharacterDeleted={(characterId) => void handleDelete(characterId)}
        />
      </div>
    </main>
  )
}
