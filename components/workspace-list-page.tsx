"use client"

import { ArrowLeft, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { type FormEvent, useEffect, useState } from "react"

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
    <main className="min-h-svh bg-muted/20">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Home
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-muted-foreground">
            Create a group, invite teammates, and share practice characters.
          </p>
        </div>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)}>
              <Plus />
              New workspace
            </Button>
          ) : (
            <form className="space-y-3" onSubmit={createWorkspace}>
              <h2 className="font-semibold">Create workspace</h2>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Team or company name"
                required
                minLength={2}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspaces/${workspace.id}`}
                className={cn(
                  "rounded-2xl border bg-card p-5 shadow-sm transition-all",
                  "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
                )}
              >
                <p className="text-lg font-semibold">{workspace.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {workspace.description ?? "No description yet"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground capitalize">
                  {workspace.role}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
