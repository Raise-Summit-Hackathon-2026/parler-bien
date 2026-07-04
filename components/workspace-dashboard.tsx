"use client"

import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  Share2,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react"
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const CONTEXT_BUCKET = "persona-context"
const MAX_CONTEXT_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_CONTEXT_TYPES =
  "application/pdf,text/plain,text/markdown,image/jpeg,image/png,image/webp,image/heic,.pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic"

type WorkspaceRow = {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  company_name: string | null
  purpose: string
  visibility: "private" | "shared"
  created_at: string
}

type PersonaRow = {
  id: string
  workspace_id: string
  created_by: string
  name: string
  role_title: string | null
  voice_tone: string | null
  instructions: string
  greeting: string | null
  avatar_prompt: string | null
  created_at: string
}

type ContextRow = {
  id: string
  workspace_id: string
  persona_id: string | null
  created_by: string
  kind: "text" | "file" | "photo"
  title: string
  body_text: string | null
  storage_bucket: string | null
  storage_path: string | null
  mime_type: string | null
  file_size_bytes: number | null
  source_name: string | null
  created_at: string
}

type ShareLinkRow = {
  id: string
  workspace_id: string
  token: string
  permission: "read" | "edit"
  revoked_at: string | null
  created_at: string
}

type WorkspaceDashboardProps = {
  onBack: () => void
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return slug || `workspace-${Date.now()}`
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function formatBytes(value: number | null) {
  if (!value) return ""
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function getShareUrl(token: string) {
  if (typeof window === "undefined") return `/share/${token}`
  return `${window.location.origin}/share/${token}`
}

const demoInstructions = `You are the Galeries Lafayette service coach for luxury retail teams.

Use the uploaded brand guidelines as the source of truth. Keep every roleplay premium, courteous, and Paris-specific. Coach the learner toward welcoming language, confident product discovery, graceful escalation, and clear next actions.`

const demoGuidelines = `Galeries Lafayette training guidelines

- Greet every customer within five seconds with a warm, polished opening.
- Discover intent before recommending products: occasion, recipient, budget, style, and urgency.
- Never pressure the customer. Use refinement, confidence, and useful detail.
- Escalate security, lost item, tax refund, and complaint cases to the right desk.
- Keep language concise, elegant, and practical for the shop floor.`

export function WorkspaceDashboard({ onBack }: WorkspaceDashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([])
  const [personas, setPersonas] = useState<PersonaRow[]>([])
  const [contexts, setContexts] = useState<ContextRow[]>([])
  const [shareLinks, setShareLinks] = useState<ShareLinkRow[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceDescription, setWorkspaceDescription] = useState("")
  const [personaName, setPersonaName] = useState("")
  const [personaRole, setPersonaRole] = useState("")
  const [personaInstructions, setPersonaInstructions] = useState("")
  const [contextTitle, setContextTitle] = useState("")
  const [contextText, setContextText] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(true)

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces],
  )

  const workspacePersonas = useMemo(
    () =>
      activeWorkspace
        ? personas.filter((persona) => persona.workspace_id === activeWorkspace.id)
        : [],
    [activeWorkspace, personas],
  )

  const activePersona =
    workspacePersonas.find((persona) => persona.id === selectedPersonaId) ??
    workspacePersonas[0] ??
    null

  const personaContexts = useMemo(
    () =>
      activePersona
        ? contexts.filter((item) => item.persona_id === activePersona.id)
        : activeWorkspace
          ? contexts.filter((item) => item.workspace_id === activeWorkspace.id)
          : [],
    [activePersona, activeWorkspace, contexts],
  )

  const activeShareLink = activeWorkspace
    ? shareLinks.find(
        (link) => link.workspace_id === activeWorkspace.id && !link.revoked_at,
      )
    : null

  async function loadWorkspaceData(nextSelectedId?: string) {
    const supabase = getSupabaseBrowserClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error("Sign in to manage workspaces")
    }

    setUserId(user.id)

    const [workspaceResult, personaResult, contextResult, shareResult] =
      await Promise.all([
        supabase
          .from("user_workspaces")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("workspace_personas")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("persona_context_items")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("workspace_share_links")
          .select("*")
          .order("created_at", { ascending: false }),
      ])

    if (workspaceResult.error) throw workspaceResult.error
    if (personaResult.error) throw personaResult.error
    if (contextResult.error) throw contextResult.error
    if (shareResult.error) throw shareResult.error

    const nextWorkspaces = (workspaceResult.data ?? []) as WorkspaceRow[]
    const nextPersonas = (personaResult.data ?? []) as PersonaRow[]

    setWorkspaces(nextWorkspaces)
    setPersonas(nextPersonas)
    setContexts((contextResult.data ?? []) as ContextRow[])
    setShareLinks((shareResult.data ?? []) as ShareLinkRow[])

    const workspaceId = nextSelectedId ?? selectedWorkspaceId ?? nextWorkspaces[0]?.id ?? null
    setSelectedWorkspaceId(workspaceId)
    setSelectedPersonaId(
      nextPersonas.find((persona) => persona.workspace_id === workspaceId)?.id ?? null,
    )
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadWorkspaceData()
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Failed to load workspaces"),
        )
        .finally(() => setBusy(false))
    }, 0)

    return () => window.clearTimeout(timer)
    // load once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId) return

    setBusy(true)
    setError("")
    setStatus("")

    try {
      const name = workspaceName.trim()
      const supabase = getSupabaseBrowserClient()
      const { data, error: insertError } = await supabase
        .from("user_workspaces")
        .insert({
          owner_id: userId,
          name,
          slug: `${slugify(name)}-${Date.now().toString(36)}`,
          description: workspaceDescription.trim() || null,
          company_name: name,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setWorkspaceName("")
      setWorkspaceDescription("")
      setStatus("Workspace created")
      await loadWorkspaceData((data as WorkspaceRow).id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace")
    } finally {
      setBusy(false)
    }
  }

  async function createGaleriesDemo() {
    if (!userId) return

    setBusy(true)
    setError("")
    setStatus("")

    try {
      const supabase = getSupabaseBrowserClient()
      const { data: workspace, error: workspaceError } = await supabase
        .from("user_workspaces")
        .insert({
          owner_id: userId,
          name: "Galeries Lafayette Training",
          slug: `galeries-lafayette-${Date.now().toString(36)}`,
          description:
            "A luxury retail workspace for sales, service, security, and customer satisfaction practice.",
          company_name: "Galeries Lafayette",
          visibility: "shared",
        })
        .select()
        .single()

      if (workspaceError) throw workspaceError

      const workspaceRow = workspace as WorkspaceRow
      const { data: persona, error: personaError } = await supabase
        .from("workspace_personas")
        .insert({
          workspace_id: workspaceRow.id,
          created_by: userId,
          name: "Luxury Retail Service Coach",
          role_title: "Galeries Lafayette floor trainer",
          voice_tone: "Polished, practical, warm, and precise.",
          instructions: demoInstructions,
          greeting:
            "Bonjour. Today we will practice elegant customer service under the dome.",
          avatar_prompt:
            "Luxury Paris department store service trainer under an art nouveau glass dome, refined editorial photo style",
        })
        .select()
        .single()

      if (personaError) throw personaError

      const personaRow = persona as PersonaRow
      const { error: contextError } = await supabase
        .from("persona_context_items")
        .insert({
          workspace_id: workspaceRow.id,
          persona_id: personaRow.id,
          created_by: userId,
          kind: "text",
          title: "Demo guideline brief",
          body_text: demoGuidelines,
          source_name: "galeries-lafayette-guidelines-demo.txt",
        })

      if (contextError) throw contextError

      setStatus("Galeries Lafayette workspace created. Upload the real PDF guideline next.")
      await loadWorkspaceData(workspaceRow.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create demo workspace")
    } finally {
      setBusy(false)
    }
  }

  async function createPersona(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeWorkspace || !userId) return

    setBusy(true)
    setError("")
    setStatus("")

    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error: insertError } = await supabase
        .from("workspace_personas")
        .insert({
          workspace_id: activeWorkspace.id,
          created_by: userId,
          name: personaName.trim(),
          role_title: personaRole.trim() || null,
          instructions: personaInstructions.trim(),
          voice_tone: "Natural, helpful, and context-aware.",
        })
        .select()
        .single()

      if (insertError) throw insertError

      setPersonaName("")
      setPersonaRole("")
      setPersonaInstructions("")
      setStatus("Persona created")
      await loadWorkspaceData(activeWorkspace.id)
      setSelectedPersonaId((data as PersonaRow).id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create persona")
    } finally {
      setBusy(false)
    }
  }

  async function addTextContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeWorkspace || !activePersona || !userId) return

    setBusy(true)
    setError("")
    setStatus("")

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: insertError } = await supabase
        .from("persona_context_items")
        .insert({
          workspace_id: activeWorkspace.id,
          persona_id: activePersona.id,
          created_by: userId,
          kind: "text",
          title: contextTitle.trim(),
          body_text: contextText.trim(),
        })

      if (insertError) throw insertError

      setContextTitle("")
      setContextText("")
      setStatus("Context saved")
      await loadWorkspaceData(activeWorkspace.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save context")
    } finally {
      setBusy(false)
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !activeWorkspace || !activePersona || !userId) return

    if (file.size > MAX_CONTEXT_FILE_BYTES) {
      setError("Context uploads must be under 10 MB")
      return
    }

    setBusy(true)
    setError("")
    setStatus("")

    const supabase = getSupabaseBrowserClient()
    const kind: ContextRow["kind"] = file.type.startsWith("image/") ? "photo" : "file"
    const storagePath = `${userId}/${activeWorkspace.id}/${activePersona.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`

    try {
      const { error: uploadError } = await supabase.storage
        .from(CONTEXT_BUCKET)
        .upload(storagePath, file, { contentType: file.type || undefined })

      if (uploadError) throw uploadError

      const { error: insertError } = await supabase
        .from("persona_context_items")
        .insert({
          workspace_id: activeWorkspace.id,
          persona_id: activePersona.id,
          created_by: userId,
          kind,
          title: file.name,
          storage_bucket: CONTEXT_BUCKET,
          storage_path: storagePath,
          mime_type: file.type || null,
          file_size_bytes: file.size,
          source_name: file.name,
        })

      if (insertError) {
        await supabase.storage.from(CONTEXT_BUCKET).remove([storagePath])
        throw insertError
      }

      setStatus(`${kind === "photo" ? "Photo" : "File"} uploaded`)
      await loadWorkspaceData(activeWorkspace.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload context")
    } finally {
      setBusy(false)
    }
  }

  async function createShareLink() {
    if (!activeWorkspace || !userId) return

    setBusy(true)
    setError("")
    setStatus("")

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: insertError } = await supabase
        .from("workspace_share_links")
        .insert({
          workspace_id: activeWorkspace.id,
          created_by: userId,
          permission: "read",
        })

      if (insertError) throw insertError

      setStatus("Share link created")
      await loadWorkspaceData(activeWorkspace.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share link")
    } finally {
      setBusy(false)
    }
  }

  async function copyShareLink() {
    if (!activeShareLink) return
    await navigator.clipboard.writeText(getShareUrl(activeShareLink.token))
    setStatus("Share link copied")
  }

  return (
    <main className="min-h-svh bg-[#f7f5ef] text-[#1b1b18]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft />
            Home
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void createGaleriesDemo()}
            disabled={busy || !userId}
          >
            <Sparkles />
            Galeries Lafayette demo
          </Button>
        </div>

        <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-lg border border-[#d8d0c2] bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BriefcaseBusiness className="size-4" />
                <h1 className="text-lg font-semibold">Workspaces</h1>
              </div>
              <form className="space-y-3" onSubmit={createWorkspace}>
                <input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="Workspace name"
                  required
                  minLength={2}
                  className="h-10 w-full rounded-md border border-[#d8d0c2] bg-white px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[#b89b5e]/30"
                />
                <textarea
                  value={workspaceDescription}
                  onChange={(event) => setWorkspaceDescription(event.target.value)}
                  placeholder="Training purpose, company, or team notes"
                  rows={3}
                  className="w-full resize-none rounded-md border border-[#d8d0c2] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[#b89b5e]/30"
                />
                <Button className="w-full bg-[#1b1b18] text-white hover:bg-[#3a342c]" disabled={busy}>
                  <Plus />
                  Create workspace
                </Button>
              </form>
            </div>

            <div className="space-y-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    setSelectedWorkspaceId(workspace.id)
                    setSelectedPersonaId(
                      personas.find((persona) => persona.workspace_id === workspace.id)?.id ??
                        null,
                    )
                  }}
                  className={cn(
                    "w-full rounded-lg border bg-white p-3 text-left shadow-sm transition-colors",
                    selectedWorkspaceId === workspace.id
                      ? "border-[#9d7f42] ring-3 ring-[#b89b5e]/20"
                      : "border-[#d8d0c2] hover:border-[#9d7f42]",
                  )}
                >
                  <p className="font-medium">{workspace.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#6d6255]">
                    {workspace.description ?? "No description yet"}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-[620px] rounded-lg border border-[#d8d0c2] bg-white shadow-sm">
            {busy && workspaces.length === 0 ? (
              <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-[#6d6255]">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading workspaces
              </div>
            ) : !activeWorkspace ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
                <Building2 className="size-10 text-[#9d7f42]" />
                <h2 className="text-xl font-semibold">Create your first workspace</h2>
                <p className="max-w-md text-sm text-[#6d6255]">
                  Workspaces hold a company, course, or team context. Add personas
                  inside them, then drop text, PDFs, files, or photos as source material.
                </p>
              </div>
            ) : (
              <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6 p-5 lg:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8e0d2] pb-5">
                    <div>
                      <p className="text-xs font-medium tracking-[0.18em] text-[#8b785c] uppercase">
                        Workspace
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold">{activeWorkspace.name}</h2>
                      <p className="mt-1 max-w-2xl text-sm text-[#6d6255]">
                        {activeWorkspace.description ??
                          "Add personas and context to make roleplay generation specific."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {activeShareLink ? (
                        <Button variant="outline" onClick={() => void copyShareLink()}>
                          <Link2 />
                          Copy share link
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => void createShareLink()}
                          disabled={busy}
                        >
                          <Share2 />
                          Share
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <form className="rounded-lg border border-[#e8e0d2] p-4" onSubmit={createPersona}>
                      <div className="mb-4 flex items-center gap-2">
                        <UserRound className="size-4 text-[#9d7f42]" />
                        <h3 className="font-semibold">Create persona</h3>
                      </div>
                      <div className="space-y-3">
                        <input
                          value={personaName}
                          onChange={(event) => setPersonaName(event.target.value)}
                          placeholder="Persona name"
                          required
                          minLength={2}
                          className="h-10 w-full rounded-md border border-[#d8d0c2] px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[#b89b5e]/30"
                        />
                        <input
                          value={personaRole}
                          onChange={(event) => setPersonaRole(event.target.value)}
                          placeholder="Role, department, or job title"
                          className="h-10 w-full rounded-md border border-[#d8d0c2] px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[#b89b5e]/30"
                        />
                        <textarea
                          value={personaInstructions}
                          onChange={(event) => setPersonaInstructions(event.target.value)}
                          placeholder="How should this persona behave? What should it enforce?"
                          required
                          rows={5}
                          className="w-full resize-none rounded-md border border-[#d8d0c2] px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[#b89b5e]/30"
                        />
                        <Button disabled={busy}>
                          <Plus />
                          Save persona
                        </Button>
                      </div>
                    </form>

                    <form className="rounded-lg border border-[#e8e0d2] p-4" onSubmit={addTextContext}>
                      <div className="mb-4 flex items-center gap-2">
                        <FileText className="size-4 text-[#9d7f42]" />
                        <h3 className="font-semibold">Drop text context</h3>
                      </div>
                      <div className="space-y-3">
                        <input
                          value={contextTitle}
                          onChange={(event) => setContextTitle(event.target.value)}
                          placeholder="Context title"
                          required
                          className="h-10 w-full rounded-md border border-[#d8d0c2] px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[#b89b5e]/30"
                          disabled={!activePersona}
                        />
                        <textarea
                          value={contextText}
                          onChange={(event) => setContextText(event.target.value)}
                          placeholder="Paste guidelines, scripts, brand tone, product details, or scoring rules."
                          required
                          rows={5}
                          className="w-full resize-none rounded-md border border-[#d8d0c2] px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[#b89b5e]/30"
                          disabled={!activePersona}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={busy || !activePersona}>
                            <FileText />
                            Save text
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy || !activePersona}
                          >
                            <Upload />
                            Upload file/photo
                          </Button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={ACCEPTED_CONTEXT_TYPES}
                          className="hidden"
                          onChange={(event) => void handleFileChange(event)}
                        />
                      </div>
                    </form>
                  </div>

                  {(error || status) && (
                    <div
                      className={cn(
                        "rounded-lg border px-4 py-3 text-sm",
                        error
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {error || status}
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="font-semibold">Persona context</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {personaContexts.map((item) => (
                        <div key={item.id} className="rounded-lg border border-[#e8e0d2] p-4">
                          <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#f1eadb] text-[#7a6436]">
                              {item.kind === "photo" ? (
                                <ImageIcon className="size-4" />
                              ) : (
                                <FileText className="size-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium">{item.title}</p>
                              <p className="mt-1 text-xs text-[#6d6255]">
                                {item.kind} {formatBytes(item.file_size_bytes)}
                              </p>
                              {item.body_text && (
                                <p className="mt-2 line-clamp-3 text-sm text-[#4f463d]">
                                  {item.body_text}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="border-t border-[#e8e0d2] bg-[#fbfaf6] p-5 lg:border-t-0 lg:border-l">
                  <h3 className="font-semibold">Personas</h3>
                  <div className="mt-4 space-y-2">
                    {workspacePersonas.map((persona) => (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => setSelectedPersonaId(persona.id)}
                        className={cn(
                          "w-full rounded-lg border bg-white p-3 text-left transition-colors",
                          activePersona?.id === persona.id
                            ? "border-[#9d7f42] ring-3 ring-[#b89b5e]/20"
                            : "border-[#e8e0d2] hover:border-[#9d7f42]",
                        )}
                      >
                        <p className="font-medium">{persona.name}</p>
                        <p className="mt-1 text-xs text-[#6d6255]">
                          {persona.role_title ?? "Workspace persona"}
                        </p>
                      </button>
                    ))}
                  </div>

                  {activePersona && (
                    <div className="mt-6 rounded-lg border border-[#e8e0d2] bg-white p-4">
                      <p className="text-xs font-medium tracking-[0.18em] text-[#8b785c] uppercase">
                        Active persona
                      </p>
                      <h4 className="mt-2 font-semibold">{activePersona.name}</h4>
                      <p className="mt-2 whitespace-pre-line text-sm text-[#4f463d]">
                        {activePersona.instructions}
                      </p>
                    </div>
                  )}
                </aside>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  )
}
