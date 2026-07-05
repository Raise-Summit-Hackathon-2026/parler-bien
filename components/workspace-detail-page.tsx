"use client"

import {
  ArrowLeft,
  ChevronDown,
  Link2,
  Loader2,
  LogOut,
  MailPlus,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useCallback, useEffect, useState } from "react"

import { CharacterGrid } from "@/components/character-grid"
import { CinematicPageShell } from "@/components/cinematic-page-shell"
import { ScenarioScene } from "@/components/scenario-scene"
import { Button } from "@/components/ui/button"
import { rowToCharacter } from "@/lib/character-compat"
import { isBuiltInCharacterId } from "@/lib/characters/index"
import {
  createShareLink,
  deleteCharacter,
  deleteWorkspace,
  getActiveShareLink,
  getWorkspace,
  inviteWorkspaceMember,
  leaveWorkspace,
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
  const [leaveBusy, setLeaveBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
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

  async function handleLeaveWorkspace() {
    setLeaveBusy(true)
    setError("")
    setStatus("")

    try {
      await leaveWorkspace(workspaceId)
      router.push("/workspaces")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to leave workspace",
      )
      setConfirmLeave(false)
    } finally {
      setLeaveBusy(false)
    }
  }

  if (busy && !workspace) {
    return (
      <CinematicPageShell contentClassName="min-h-[60vh] items-center justify-center">
        <div className="flex items-center justify-center text-sm text-muted-foreground dark:text-white/55">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading workspace
      </div>
      </CinematicPageShell>
    )
  }

  if (!workspace) {
    return (
      <CinematicPageShell contentClassName="min-h-[60vh] items-center justify-center">
      <div className="max-w-lg rounded-3xl border bg-card p-8 text-center shadow-xl dark:border-white/10 dark:bg-white/3">
        <p className="text-muted-foreground dark:text-white/55">Workspace not found.</p>
        <Link
          href="/workspaces"
          className="mt-4 inline-block text-sm font-medium text-lime-700 underline-offset-4 hover:underline dark:text-lime-300"
        >
          Back to workspaces
        </Link>
      </div>
      </CinematicPageShell>
    )
  }

  const firstCharacter = characters[0] ? rowToCharacter(characters[0]) : null
  const memberPreview = members.slice(0, 4)

  return (
    <CinematicPageShell contentClassName="gap-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/workspaces"
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white"
            >
              <ArrowLeft className="size-4" />
              All workspaces
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handleShare()}
              className="rounded-xl dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <Link2 />
              Copy invite link
            </Button>
            {isOwner && !confirmDelete && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setConfirmDelete(true)
                  setConfirmLeave(false)
                  setError("")
                  setStatus("")
                }}
              >
                <Trash2 />
                Delete workspace
              </Button>
            )}
            {!isOwner && !confirmLeave && (
              <Button
                variant="outline"
                className="rounded-xl dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                onClick={() => {
                  setConfirmLeave(true)
                  setConfirmDelete(false)
                  setError("")
                  setStatus("")
                }}
              >
                <LogOut />
                Leave workspace
              </Button>
            )}
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[14rem_1fr] lg:items-center">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-xl shadow-black/10 dark:border-white/10 dark:bg-white/3 dark:shadow-black/50">
            {firstCharacter ? (
              <ScenarioScene
                scenarioId={
                  isBuiltInCharacterId(firstCharacter.id) ? firstCharacter.id : undefined
                }
                imagePrompt={
                  isBuiltInCharacterId(firstCharacter.id)
                    ? undefined
                    : firstCharacter.avatarPrompt
                }
                className="aspect-4/3 rounded-none"
              />
            ) : (
              <div className="flex aspect-4/3 items-center justify-center bg-lime-600/10 text-lime-700 dark:bg-lime-300/10 dark:text-lime-300">
                <Sparkles className="size-10" />
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-600/20 bg-lime-600/10 px-3 py-1 text-xs font-medium text-lime-700 dark:border-lime-300/20 dark:bg-lime-300/10 dark:text-lime-300">
                <Users className="size-3.5" />
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/50">
                <Sparkles className="size-3.5" />
                Role-play scenarios
              </span>
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                {workspace.name}
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground dark:text-white/55">
                {workspace.description ??
                  "Add characters for your team to practice together."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["AI feedback", "Team progress", "Real conversations"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/50"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

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

        {!isOwner && confirmLeave && (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <h2 className="font-semibold text-destructive">Leave workspace?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You will lose access to &ldquo;{workspace.name}&rdquo; and its
              shared characters. You can rejoin if someone invites you again.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={leaveBusy}
                onClick={() => void handleLeaveWorkspace()}
              >
                {leaveBusy ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <LogOut />
                )}
                Leave workspace
              </Button>
              <Button
                variant="ghost"
                disabled={leaveBusy}
                onClick={() => setConfirmLeave(false)}
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
                : "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
            }
          >
            {error || status}
          </p>
        )}

        <section className="rounded-3xl border bg-card/90 shadow-xl shadow-black/10 ring-1 ring-border/50 dark:border-white/10 dark:bg-white/3 dark:shadow-black/40 dark:ring-white/5">
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
              <p className="mt-1 text-sm text-muted-foreground dark:text-white/50">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
            <div className="ml-auto hidden items-center -space-x-2 sm:flex">
              {memberPreview.map((member) => (
                <span
                  key={member.id}
                  className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-lime-600/10 text-xs font-semibold text-lime-700 dark:border-[#101216] dark:bg-lime-300/15 dark:text-lime-200"
                  title={member.email}
                >
                  {member.email.slice(0, 1).toUpperCase()}
                </span>
              ))}
              {members.length > memberPreview.length && (
                <span className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-muted-foreground dark:border-[#101216] dark:bg-white/10 dark:text-white/55">
                  +{members.length - memberPreview.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`size-5 text-muted-foreground transition-transform ${
                membersOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {membersOpen && (
            <div className="border-t p-5 pt-4 dark:border-white/10">
              <p className="text-sm text-muted-foreground dark:text-white/50">
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
                  className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/10 dark:bg-white/5"
                />
                <Button
                  type="submit"
                  disabled={inviteBusy}
                  className="rounded-xl bg-lime-600 text-white hover:bg-lime-700 dark:bg-lime-300 dark:text-black dark:hover:bg-lime-200"
                >
                  {inviteBusy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <MailPlus />
                  )}
                  Invite
                </Button>
              </form>

              <div className="mt-5 divide-y rounded-2xl border dark:divide-white/10 dark:border-white/10">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{member.email}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize dark:bg-white/5 dark:text-white/50">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your characters</h2>
              <p className="text-sm text-muted-foreground dark:text-white/50">
                Role-play tracks shared with this workspace.
              </p>
            </div>
            <span className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/50 sm:inline-flex">
              <Plus className="size-3.5" />
              Add from the card below
            </span>
          </div>
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
        </section>
    </CinematicPageShell>
  )
}
