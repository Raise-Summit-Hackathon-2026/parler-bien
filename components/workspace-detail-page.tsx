"use client"

import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Link2,
  Loader2,
  Plus,
  Share2,
  Sparkles,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { LevelEditorForm, type LevelFormValues } from "@/components/level-editor-form"
import { PersonaEditorForm, type PersonaFormValues } from "@/components/persona-editor-form"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type {
  WorkspaceLevelRow,
  WorkspacePersonaRow,
  WorkspaceRow,
  WorkspaceTrackRow,
} from "@/lib/workspace-types"
import { cn } from "@/lib/utils"

const CONTEXT_BUCKET = "persona-context"
const MAX_CONTEXT_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_CONTEXT_TYPES =
  "application/pdf,text/plain,text/markdown,image/jpeg,image/png,image/webp,image/heic,.pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic"

type ContextRow = {
  id: string
  workspace_id: string
  persona_id: string | null
  kind: "text" | "file" | "photo"
  title: string
  body_text: string | null
  file_size_bytes: number | null
}

type ShareLinkRow = {
  id: string
  token: string
  revoked_at: string | null
}

type Tab = "personas" | "tracks" | "context" | "share"

type WorkspaceDetailPageProps = {
  workspaceId: string
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .slice(0, 80)
}

export function WorkspaceDetailPage({ workspaceId }: WorkspaceDetailPageProps) {
  const searchParams = useSearchParams()
  const isGenerated = searchParams.get("generated") === "1"
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>("personas")
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null)
  const [personas, setPersonas] = useState<WorkspacePersonaRow[]>([])
  const [tracks, setTracks] = useState<WorkspaceTrackRow[]>([])
  const [levels, setLevels] = useState<WorkspaceLevelRow[]>([])
  const [contexts, setContexts] = useState<ContextRow[]>([])
  const [shareLinks, setShareLinks] = useState<ShareLinkRow[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [editingPersonaId, setEditingPersonaId] = useState<string | "new" | null>(null)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [editingLevelId, setEditingLevelId] = useState<string | "new" | null>(null)
  const [trackTitle, setTrackTitle] = useState("")
  const [trackDescription, setTrackDescription] = useState("")
  const [trackPersonaId, setTrackPersonaId] = useState("")
  const [contextTitle, setContextTitle] = useState("")
  const [contextText, setContextText] = useState("")
  const [busy, setBusy] = useState(true)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  const activePersona = personas.find((p) => p.id === selectedPersonaId) ?? personas[0] ?? null
  const activeTrack = tracks.find((t) => t.id === selectedTrackId) ?? tracks[0] ?? null
  const activeTrackPersona = activeTrack
    ? personas.find((persona) => persona.id === activeTrack.persona_id) ?? null
    : null
  const trackLevels = useMemo(
    () =>
      activeTrack
        ? levels
            .filter((l) => l.track_id === activeTrack.id)
            .sort((a, b) => a.position - b.position)
        : [],
    [activeTrack, levels],
  )
  const activeShare = shareLinks.find((l) => !l.revoked_at)

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const [ws, personaRes, trackRes, contextRes, shareRes] = await Promise.all([
      supabase.from("user_workspaces").select("*").eq("id", workspaceId).single(),
      supabase.from("workspace_personas").select("*").eq("workspace_id", workspaceId).order("created_at"),
      supabase.from("workspace_tracks").select("*").eq("workspace_id", workspaceId).order("position"),
      supabase.from("persona_context_items").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      supabase.from("workspace_share_links").select("*").eq("workspace_id", workspaceId),
    ])

    if (ws.error) throw ws.error
    if (personaRes.error) throw personaRes.error
    if (trackRes.error) throw trackRes.error
    if (contextRes.error) throw contextRes.error
    if (shareRes.error) throw shareRes.error

    setWorkspace(ws.data as WorkspaceRow)
    const nextPersonas = (personaRes.data ?? []) as WorkspacePersonaRow[]
    const nextTracks = (trackRes.data ?? []) as WorkspaceTrackRow[]
    setPersonas(nextPersonas)
    setTracks(nextTracks)

    const trackIds = nextTracks.map((t) => t.id)
    if (trackIds.length > 0) {
      const { data: levelData, error: levelError } = await supabase
        .from("workspace_levels")
        .select("*")
        .in("track_id", trackIds)
        .order("position")
      if (levelError) throw levelError
      setLevels((levelData ?? []) as WorkspaceLevelRow[])
    } else {
      setLevels([])
    }
    setContexts((contextRes.data ?? []) as ContextRow[])
    setShareLinks((shareRes.data ?? []) as ShareLinkRow[])
    setSelectedPersonaId((current) => current ?? nextPersonas[0]?.id ?? null)
    setSelectedTrackId((current) => current ?? nextTracks[0]?.id ?? null)
    setTrackPersonaId((current) => current || nextPersonas[0]?.id || "")
  }, [workspaceId])

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setBusy(false))
  }, [load])

  async function savePersona(values: PersonaFormValues) {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Sign in required")

    const payload = {
      name: values.name.trim(),
      role_title: values.role_title.trim() || null,
      tagline: values.tagline.trim() || null,
      agent_type: values.agent_type,
      capabilities: values.capabilities,
      voice_age_range: values.voice_age_range,
      voice_gender: values.voice_gender,
      voice_tone: values.voice_tone || null,
      delivery_style: values.delivery_style || null,
      coaching_style: values.coaching_style || null,
      skills: values.skills,
      preview_script: values.preview_script || null,
      persona_base: values.persona_base,
      instructions: values.persona_base,
      avatar_prompt: values.avatar_prompt || null,
      greeting: values.greeting || null,
      theme_color: values.theme_color,
      live_avatar_id: values.live_avatar_id || null,
    }

    if (editingPersonaId && editingPersonaId !== "new") {
      const { error: updateError } = await supabase
        .from("workspace_personas")
        .update(payload)
        .eq("id", editingPersonaId)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase.from("workspace_personas").insert({
        ...payload,
        workspace_id: workspaceId,
        created_by: user.id,
      })
      if (insertError) throw insertError
    }

    setEditingPersonaId(null)
    setStatus("Persona saved")
    await load()
  }

  async function createTrack(event: FormEvent) {
    event.preventDefault()
    if (!trackPersonaId) return
    const supabase = getSupabaseBrowserClient()
    const { error: insertError } = await supabase.from("workspace_tracks").insert({
      workspace_id: workspaceId,
      persona_id: trackPersonaId,
      title: trackTitle.trim(),
      description: trackDescription.trim() || null,
      theme_color: personas.find((p) => p.id === trackPersonaId)?.theme_color ?? "#3b82f6",
      position: tracks.length,
    })
    if (insertError) throw insertError
    setTrackTitle("")
    setTrackDescription("")
    setStatus("Track created")
    await load()
  }

  async function saveLevel(values: LevelFormValues) {
    if (!activeTrack) return
    const supabase = getSupabaseBrowserClient()
    const payload = {
      track_id: activeTrack.id,
      position: values.position,
      title: values.title.trim(),
      subtitle: values.subtitle.trim(),
      status: values.status,
      pass_criteria: values.pass_criteria,
      room: values.room,
      language_id: values.language_id,
      region_id: values.region_id,
    }

    if (editingLevelId && editingLevelId !== "new") {
      const { error: updateError } = await supabase
        .from("workspace_levels")
        .update(payload)
        .eq("id", editingLevelId)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase
        .from("workspace_levels")
        .insert(payload)
      if (insertError) throw insertError
    }

    setEditingLevelId(null)
    setStatus("Level saved")
    await load()
  }

  async function addTextContext(event: FormEvent) {
    event.preventDefault()
    if (!activePersona) return
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error: insertError } = await supabase.from("persona_context_items").insert({
      workspace_id: workspaceId,
      persona_id: activePersona.id,
      created_by: user.id,
      kind: "text",
      title: contextTitle.trim(),
      body_text: contextText.trim(),
    })
    if (insertError) throw insertError
    setContextTitle("")
    setContextText("")
    setStatus("Context saved")
    await load()
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !activePersona) return
    if (file.size > MAX_CONTEXT_FILE_BYTES) {
      setError("Files must be under 10 MB")
      return
    }

    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const kind = file.type.startsWith("image/") ? "photo" : "file"
    const storagePath = `${user.id}/${workspaceId}/${activePersona.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from(CONTEXT_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined })
    if (uploadError) throw uploadError

    const { error: insertError } = await supabase.from("persona_context_items").insert({
      workspace_id: workspaceId,
      persona_id: activePersona.id,
      created_by: user.id,
      kind,
      title: file.name,
      storage_bucket: CONTEXT_BUCKET,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      source_name: file.name,
    })
    if (insertError) throw insertError
    setStatus("File uploaded")
    await load()
  }

  async function createShareLink() {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error: insertError } = await supabase.from("workspace_share_links").insert({
      workspace_id: workspaceId,
      created_by: user.id,
      permission: "read",
    })
    if (insertError) throw insertError
    setStatus("Share link created")
    await load()
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/workspaces"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Workspaces
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">{workspace.name}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              {workspace.description ?? "Configure personas, tracks, and levels step by step."}
            </p>
          </div>
        </div>

        {isGenerated && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Generated from your source material — review and adjust personas, tracks, and levels
              below.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b pb-2">
          {(["personas", "tracks", "context", "share"] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize",
                tab === item ? "bg-muted" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {(error || status) && (
          <p
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              error
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
            )}
          >
            {error || status}
          </p>
        )}

        {tab === "personas" && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setEditingPersonaId("new")}
              >
                <Plus />
                New persona
              </Button>
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => {
                    setSelectedPersonaId(persona.id)
                    setEditingPersonaId(persona.id)
                  }}
                  className={cn(
                    "w-full rounded-lg border bg-card p-3 text-left",
                    selectedPersonaId === persona.id && "ring-2 ring-primary/30",
                  )}
                >
                  <p className="font-medium">{persona.name}</p>
                  <p className="text-xs text-muted-foreground">{persona.role_title}</p>
                </button>
              ))}
            </aside>
            <section className="rounded-2xl border bg-card p-6">
              {editingPersonaId ? (
                <PersonaEditorForm
                  key={editingPersonaId}
                  initial={
                    editingPersonaId === "new"
                      ? undefined
                      : personas.find((p) => p.id === editingPersonaId)
                  }
                  onSubmit={savePersona}
                  onCancel={() => setEditingPersonaId(null)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a persona or create one to configure agent type, voice, skills, and coaching style.
                </p>
              )}
            </section>
          </div>
        )}

        {tab === "tracks" && (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-4">
              <form className="space-y-2 rounded-xl border bg-card p-4" onSubmit={createTrack}>
                <p className="font-semibold">New track</p>
                <input
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  placeholder="Track title"
                  required
                />
                <textarea
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                  rows={2}
                  value={trackDescription}
                  onChange={(e) => setTrackDescription(e.target.value)}
                  placeholder="Description"
                />
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  value={trackPersonaId}
                  onChange={(e) => setTrackPersonaId(e.target.value)}
                  required
                >
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" className="w-full">
                  <Plus />
                  Add track
                </Button>
              </form>
              {tracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => setSelectedTrackId(track.id)}
                  className={cn(
                    "w-full rounded-lg border bg-card p-3 text-left",
                    selectedTrackId === track.id && "ring-2 ring-primary/30",
                  )}
                >
                  <p className="font-medium">{track.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {track.description}
                  </p>
                </button>
              ))}
            </aside>
            <section className="space-y-4">
              {activeTrack ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                    <div>
                      <p className="font-semibold">{activeTrack.title}</p>
                      <p className="text-sm text-muted-foreground">{activeTrack.description}</p>
                    </div>
                    <Link
                      href={`/workspaces/${workspaceId}/tracks/${activeTrack.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                    >
                      Open path
                      <ChevronRight className="size-4" />
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Levels</h3>
                    <Button size="sm" variant="outline" onClick={() => setEditingLevelId("new")}>
                      <Plus />
                      Add level
                    </Button>
                  </div>
                  {editingLevelId && (
                    <div className="rounded-xl border bg-card p-4">
                      <LevelEditorForm
                        key={editingLevelId}
                        initial={
                          editingLevelId === "new"
                            ? undefined
                            : trackLevels.find((l) => l.id === editingLevelId)
                        }
                        nextPosition={trackLevels.length + 1}
                        personaLiveAvatarId={activeTrackPersona?.live_avatar_id}
                        onSubmit={saveLevel}
                        onCancel={() => setEditingLevelId(null)}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    {trackLevels.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setEditingLevelId(level.id)}
                        className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-left"
                      >
                        <div>
                          <p className="font-medium">
                            {level.position}. {level.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {level.pass_criteria.type} · {level.status}
                          </p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Create a track to add levels.</p>
              )}
            </section>
          </div>
        )}

        {tab === "context" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <form className="space-y-3 rounded-xl border bg-card p-4" onSubmit={addTextContext}>
              <div className="flex items-center gap-2">
                <FileText className="size-4" />
                <h3 className="font-semibold">Text context</h3>
              </div>
              <input
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={contextTitle}
                onChange={(e) => setContextTitle(e.target.value)}
                placeholder="Title"
                required
                disabled={!activePersona}
              />
              <textarea
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                rows={5}
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder="Guidelines, scripts, brand tone…"
                required
                disabled={!activePersona}
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={!activePersona}>
                  Save text
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!activePersona}
                >
                  <Upload />
                  Upload file
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_CONTEXT_TYPES}
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
            </form>
            <div className="space-y-2">
              {contexts.map((item) => (
                <div key={item.id} className="rounded-lg border bg-card p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.kind}</p>
                  {item.body_text && (
                    <p className="mt-2 line-clamp-3 text-sm">{item.body_text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "share" && (
          <section className="max-w-md space-y-4 rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2">
              <Share2 className="size-4" />
              <h3 className="font-semibold">Share workspace</h3>
            </div>
            {activeShare ? (
              <Button
                variant="outline"
                onClick={() =>
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/share/${activeShare.token}`,
                  )
                }
              >
                <Link2 />
                Copy share link
              </Button>
            ) : (
              <Button onClick={() => void createShareLink()}>
                <Share2 />
                Create share link
              </Button>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
