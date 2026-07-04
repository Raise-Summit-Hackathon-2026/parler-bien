"use client"

import { FileText, Loader2, Sparkles, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

import { useLanguage } from "@/components/language-provider"
import { LanguagePicker } from "@/components/language-picker"
import { Button } from "@/components/ui/button"
import { generatedPayloadToTemplate } from "@/lib/generated-workspace-mapper"
import type { GeneratedWorkspacePayload } from "@/lib/workspace-generate-schema"
import { authenticatedFetch, getSupabaseBrowserClient } from "@/lib/supabase"
import { createWorkspaceFromTemplate } from "@/lib/workspace-seed"
import { cn } from "@/lib/utils"

type WizardMode = "prompt" | "upload"

const ACCEPTED_TYPES =
  ".pdf,.txt,.md,.text,text/plain,text/markdown,application/pdf"

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"))
        return
      }
      const base64 = result.split(",")[1]
      if (!base64) {
        reject(new Error("Failed to encode file"))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
}

type WorkspaceGenerateWizardProps = {
  onBusyChange?: (busy: boolean) => void
}

export function WorkspaceGenerateWizard({ onBusyChange }: WorkspaceGenerateWizardProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { languageId, regionId, setLanguageId, setRegionId } = useLanguage()
  const [mode, setMode] = useState<WizardMode>("prompt")
  const [prompt, setPrompt] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setError(null)
    setIsGenerating(true)
    onBusyChange?.(true)

    try {
      let sourceType: "prompt" | "text" | "pdf" = "prompt"
      let requestPrompt = prompt.trim()
      let fileBase64: string | undefined
      let fileName: string | undefined

      if (mode === "upload") {
        if (!uploadedFile) {
          throw new Error("Choose a PDF or text file to upload")
        }

        fileName = uploadedFile.name

        if (isPdfFile(uploadedFile)) {
          sourceType = "pdf"
          fileBase64 = await fileToBase64(uploadedFile)
          requestPrompt = notes.trim()
        } else {
          sourceType = "text"
          requestPrompt = await uploadedFile.text()
          if (notes.trim()) {
            requestPrompt = `${requestPrompt}\n\nAdditional notes:\n${notes.trim()}`
          }
        }
      } else if (!requestPrompt) {
        throw new Error("Describe the training program you want to build")
      }

      const response = await authenticatedFetch("/api/workspace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId,
          regionId,
          sourceType,
          prompt: requestPrompt || undefined,
          fileBase64,
          fileName,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to generate workspace")
      }

      const data = (await response.json()) as {
        workspace: GeneratedWorkspacePayload
        languageId: typeof languageId
        regionId: typeof regionId
      }

      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Sign in to create a workspace")

      const template = generatedPayloadToTemplate(
        data.workspace,
        data.languageId,
        data.regionId,
      )
      const workspaceId = await createWorkspaceFromTemplate(supabase, user.id, template)
      router.push(`/workspaces/${workspaceId}?generated=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
      onBusyChange?.(false)
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      setError(null)
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-4" />
        <h2 className="font-semibold">Generate workspace with AI</h2>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Describe your training program or upload company guidelines — AI will create personas,
        tracks, and levels you can review and edit.
      </p>

      <div className="mb-5 flex gap-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => setMode("prompt")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            mode === "prompt"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-4" />
          Text prompt
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            mode === "upload"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Upload className="size-4" />
          PDF or text upload
        </button>
      </div>

      {mode === "prompt" ? (
        <div className="space-y-2">
          <label htmlFor="workspace-prompt" className="text-sm font-medium">
            What should this workspace teach?
          </label>
          <textarea
            id="workspace-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="e.g. Luxury retail training for Galeries Lafayette — greeting, styling, security, and complaint recovery under the Paris dome."
            rows={5}
            disabled={isGenerating}
            className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
            className={cn(
              "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm transition-colors",
              uploadedFile
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-foreground/30 hover:bg-muted/50",
            )}
          >
            {uploadedFile ? (
              <>
                <FileText className="size-8 text-primary" />
                <span className="font-medium">{uploadedFile.name}</span>
                <span className="text-muted-foreground">Click to choose a different file</span>
              </>
            ) : (
              <>
                <Upload className="size-8 text-muted-foreground" />
                <span className="font-medium">Upload PDF or text file</span>
                <span className="text-muted-foreground">Training guidelines, course notes, etc.</span>
              </>
            )}
          </button>
          <div className="space-y-2">
            <label htmlFor="workspace-notes" className="text-sm font-medium">
              Additional notes (optional)
            </label>
            <textarea
              id="workspace-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Focus on front-desk scenarios, 3 personas, emphasize empathy..."
              rows={3}
              disabled={isGenerating}
              className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">Target language</p>
        <LanguagePicker
          languageId={languageId}
          regionId={regionId}
          onLanguageChange={setLanguageId}
          onRegionChange={setRegionId}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        className="mt-5 w-full sm:w-auto"
        onClick={() => void handleGenerate()}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin" />
            Generating workspace…
          </>
        ) : (
          <>
            <Sparkles />
            Generate workspace
          </>
        )}
      </Button>
    </section>
  )
}
