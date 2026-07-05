"use client"

import {
  ArrowLeft,
  ChevronDown,
  Link2,
  Loader2,
  MailPlus,
  Trash2,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useCallback, useEffect, useState } from "react"

import { CharacterGrid } from "@/components/character-grid"
import { Button } from "@/components/ui/button"
import { rowToCharacter } from "@/lib/character-compat"
import {
  createShareLink,
  deleteCharacter,
  deleteWorkspace,
  getActiveShareLink,
  getWorkspace,
  inviteWorkspaceMember,
  listWorkspaceMembers,
  listWorkspaceCharacters,
} from "@/lib/character-db"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type {
  CharacterRow,
  WorkspaceMemberWithEmail,
  WorkspaceRow,
} from "@/lib/workspace-types"

type WorkspaceDetailPageProps = {
  workspaceId: string
}

export function WorkspaceDetailPage({ workspaceId }: WorkspaceDetailPageProps) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null)
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [members, setMembers] = useState<WorkspaceMemberWithEmail[]>([])
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [membersOpen, setMembersOpen] = useState(false)
  const [busy, setBusy] = useState(true)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const [ws, chars, token, roster] = await Promise.all([
      getWorkspace(workspaceId),
      listWorkspaceCharacters(workspaceId),
      getActiveShareLink(workspaceId),
      listWorkspaceMembers(workspaceId),
    ])
    setWorkspace(ws)
    setCharacters(chars)
    setShareToken(token)
    setMembers(roster)
    setIsOwner(!!user && !!ws && user.id === ws.owner_id)
  }, [workspaceId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load workspace"
        )
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
      setError(
        err instanceof Error ? err.message : "Failed to create share link"
      )
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviteBusy(true)
    setError("")
    setStatus("")

    try {
      const member = await inviteWorkspaceMember(workspaceId, inviteEmail)
      setMembers((current) => {
        const withoutExisting = current.filter((item) => item.id !== member.id)
        return [...withoutExisting, member].sort((a, b) => {
          if (a.role !== b.role) return a.role === "owner" ? -1 : 1
          return a.email.localeCompare(b.email)
        })
      })
      setInviteEmail("")
      setStatus(
        member.already_member
          ? `${member.email} is already in this workspace`
          : `${member.email} added to this workspace`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member")
    } finally {
      setInviteBusy(false)
    }
  }

  async function handleDelete(characterId: string) {
    await deleteCharacter(characterId)
    setCharacters((current) => current.filter((c) => c.id !== characterId))
  }

  async function handleDeleteWorkspace() {
    setDeleteBusy(true)
    setError("")
    setStatus("")

    try {
      await deleteWorkspace(workspaceId)
      router.push("/workspaces")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete workspace",
      )
      setConfirmDelete(false)
    } finally {
      setDeleteBusy(false)
    }
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
            <h1 className="text-3xl font-semibold tracking-tight">
              {workspace.name}
            </h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              {workspace.description ??
                "Add characters for your team to practice together."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleShare()}>
              <Link2 />
              Copy invite link
            </Button>
            {isOwner && !confirmDelete && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setConfirmDelete(true)
                  setError("")
                  setStatus("")
                }}
              >
                <Trash2 />
                Delete workspace
              </Button>
            )}
          </div>
        </div>

        {isOwner && confirmDelete && (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <h2 className="font-semibold text-destructive">Delete workspace?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This permanently deletes &ldquo;{workspace.name}&rdquo;, all shared
              characters, members, and invite links. This cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={deleteBusy}
                onClick={() => void handleDeleteWorkspace()}
              >
                {deleteBusy ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                Delete permanently
              </Button>
              <Button
                variant="ghost"
                disabled={deleteBusy}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          </section>
        )}

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

        <section className="rounded-2xl border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setMembersOpen((open) => !open)}
            className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left"
            aria-expanded={membersOpen}
          >
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Users className="size-5" />
                Members
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
            <ChevronDown
              className={`size-5 text-muted-foreground transition-transform ${
                membersOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {membersOpen && (
            <div className="border-t p-5 pt-4">
              <p className="text-sm text-muted-foreground">
                Add existing users by email so everyone can use the same
                workspace.
              </p>

              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={handleInvite}
              >
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@example.com"
                  required
                  className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <Button type="submit" disabled={inviteBusy}>
                  {inviteBusy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <MailPlus />
                  )}
                  Invite
                </Button>
              </form>

              <div className="mt-5 divide-y rounded-lg border">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{member.email}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <CharacterGrid
          characters={characters.map(rowToCharacter)}
          deletableIds={characters.map((c) => c.id)}
          workspaceId={workspaceId}
          workspaceContext={{
            name: workspace.name,
            description: workspace.description,
          }}
          onSelect={({ character, rowId }) => {
            router.push(
              `/play/${rowId ?? character.id}?from=workspace:${workspaceId}`,
            )
          }}
          onCharacterCreated={(created) =>
            setCharacters((current) => [...created, ...current])
          }
          onCharacterDeleted={(characterId) => void handleDelete(characterId)}
        />
      </div>
    </main>
  )
}
