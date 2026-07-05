"use client"

import { ArrowLeft, BriefcaseBusiness, Loader2, Plus, Sparkles } from "lucide-react"
import Link from "next/link"
import { type FormEvent, useEffect, useState } from "react"

import { CinematicPageShell } from "@/components/cinematic-page-shell"
import { Button } from "@/components/ui/button"
import { listMemberWorkspaces } from "@/lib/character-db"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { WorkspaceRow } from "@/lib/workspace-types"
import { cn } from "@/lib/utils"

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return slug || `workspace-${Date.now()}`
}

type WorkspaceListItem = WorkspaceRow & { role: "owner" | "member" }

export function WorkspaceListPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setWorkspaces(await listMemberWorkspaces())
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load workspaces"),
      )
      .finally(() => setBusy(false))
  }, [])

  async function createWorkspace(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Sign in to create a workspace")

      const trimmed = name.trim()
      const { error: insertError } = await supabase.from("user_workspaces").insert({
        owner_id: user.id,
        name: trimmed,
        slug: `${slugify(trimmed)}-${Date.now().toString(36)}`,
        description: description.trim() || null,
        company_name: trimmed,
      })
      if (insertError) throw insertError
      setName("")
      setDescription("")
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace")
    } finally {
      setBusy(false)
    }
  }

  return (
    <CinematicPageShell contentClassName="gap-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Home
          </Link>
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-lime-700 uppercase dark:text-lime-300">
              <BriefcaseBusiness className="size-3.5" />
              Team role-play spaces
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Build practice rooms for every team.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground dark:text-white/55">
              Create a group, invite teammates, and share practice characters.
            </p>
          </div>
        </div>

        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-11 rounded-xl bg-lime-600 px-5 font-semibold text-white hover:bg-lime-700 dark:bg-lime-300 dark:text-black dark:hover:bg-lime-200"
          >
            <Plus />
            New workspace
          </Button>
        )}
      </div>

      <section className="rounded-3xl border bg-card/90 p-6 shadow-2xl shadow-black/10 ring-1 ring-border/50 dark:border-white/10 dark:bg-white/3 dark:shadow-black/50 dark:ring-white/5">
          {!showForm ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Your workspaces</h2>
                <p className="text-sm text-muted-foreground dark:text-white/50">
                  Add characters, invite members, and keep practice organized.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-lime-600/20 bg-lime-600/10 px-3 py-1 text-xs font-medium text-lime-700 dark:border-lime-300/20 dark:bg-lime-300/10 dark:text-lime-300">
                <Sparkles className="size-3.5" />
                {workspaces.length} {workspaces.length === 1 ? "workspace" : "workspaces"}
              </span>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={createWorkspace}>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Create workspace</h2>
                <p className="text-sm text-muted-foreground dark:text-white/50">
                  Start with a team, course, hotel, sales floor, or any group that practices together.
                </p>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Team or company name"
                required
                minLength={2}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/10 dark:bg-white/5"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/10 dark:bg-white/5"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-lime-600 text-white hover:bg-lime-700 dark:bg-lime-300 dark:text-black dark:hover:bg-lime-200"
                >
                  Create
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
      </section>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {busy && workspaces.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading workspaces
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspaces/${workspace.id}`}
                className={cn(
                  "group rounded-3xl border bg-card/90 p-5 shadow-sm ring-1 ring-border/50 transition-all",
                  "hover:-translate-y-0.5 hover:border-lime-600/30 hover:shadow-xl dark:border-white/10 dark:bg-white/3 dark:ring-white/5 dark:hover:border-lime-300/40",
                )}
              >
                <span className="mb-5 inline-flex size-10 items-center justify-center rounded-xl border border-lime-600/20 bg-lime-600/10 text-lime-700 dark:border-lime-300/20 dark:bg-lime-300/10 dark:text-lime-300">
                  <BriefcaseBusiness className="size-5" />
                </span>
                <p className="text-lg font-semibold">{workspace.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground dark:text-white/50">
                  {workspace.description ?? "No description yet"}
                </p>
                <p className="mt-5 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground capitalize dark:bg-white/5 dark:text-white/50">
                  {workspace.role}
                </p>
              </Link>
            ))}
          </div>
        )}
    </CinematicPageShell>
  )
}
