"use client"

import { FileText, Loader2, Sparkles, Upload, X } from "lucide-react"
import { useRef, useState } from "react"

import { ContentSafetyAttribution } from "@/components/content-safety-attribution"
import { Button } from "@/components/ui/button"
import { saveCharacter } from "@/lib/characters"
import type { LanguageId, RegionId } from "@/lib/languages"
import { authenticatedFetch } from "@/lib/supabase"
import type { CharacterRow } from "@/lib/workspace-types"
import { cn } from "@/lib/utils"

type BuilderMode = "prompt" | "upload"

type CustomScenarioBuilderProps = {
  languageId: LanguageId
  regionId: RegionId
  workspaceId?: string
  onCreated: (character: CharacterRow) => void
  onCancel: () => void
}

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
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

export function CustomScenarioBuilder({
  languageId,
  regionId,
  workspaceId,
  onCreated,
  onCancel,
}: CustomScenarioBuilderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<BuilderMode>("prompt")
  const [prompt, setPrompt] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setError(null)
    setIsGenerating(true)

    try {
      let sourceType: "prompt" | "text" | "pdf" = "prompt"
      let requestPrompt = prompt.trim()
      let fileBase64: string | undefined
      let fileName: string | undefined
      let sourceLabel: string | undefined

      if (mode === "upload") {
        if (!uploadedFile) {
          throw new Error("Choose a PDF or text file to upload")
        }

        fileName = uploadedFile.name
        sourceLabel = uploadedFile.name

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
        throw new Error("Describe the scenario you want to practice")
      }

      const response = await authenticatedFetch("/api/scenario/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId,
          regionId,
          sourceType,
          prompt: requestPrompt || undefined,
          fileBase64,
          fileName,
          sourceLabel,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to generate scenario")
      }

      const data = (await response.json()) as { scenario: import("@/lib/scenarios").Scenario }
      const character = await saveCharacter(data.scenario, workspaceId)
      onCreated(character)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b p-6">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Custom scenario
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              Create your own practice
            </h2>
            <p className="text-sm text-muted-foreground">
              From a prompt, course notes, or PDF upload.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCancel}
            disabled={isGenerating}
          >
            <X />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="flex gap-2 rounded-xl bg-muted p-1">
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
              Upload
            </button>
          </div>

          {mode === "prompt" ? (
            <div className="space-y-2">
              <label htmlFor="scenario-prompt" className="text-sm font-medium">
                Describe the scenario
              </label>
              <textarea
                id="scenario-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="e.g. I'm at a pharmacy trying to explain my symptoms and get the right medicine. The pharmacist is busy but helpful."
                rows={6}
                className="w-full resize-none rounded-2xl border bg-background px-4 py-3 text-sm ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center transition-colors hover:bg-muted/60"
              >
                <FileText className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {uploadedFile
                      ? uploadedFile.name
                      : "Upload PDF or text file"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Course PDFs, lesson notes, .txt, or .md — up to 4 MB
                  </p>
                </div>
              </button>

              <div className="space-y-2">
                <label htmlFor="scenario-notes" className="text-sm font-medium">
                  Extra notes (optional)
                </label>
                <textarea
                  id="scenario-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Focus on hotel check-in vocabulary from chapter 3..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border bg-background px-4 py-3 text-sm ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          )}

          <ContentSafetyAttribution />

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t p-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles />
                Generate scenario
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
