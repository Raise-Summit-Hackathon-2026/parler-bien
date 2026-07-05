"use client"

import { FileText, Loader2, Sparkles, Upload, X } from "lucide-react"
import { useRef, useState } from "react"

import { ContentSafetyAttribution } from "@/components/content-safety-attribution"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  generatedPayloadToCharacter,
  type GeneratedCharacterPayload,
} from "@/lib/character-generate-schema"
import { saveCharacter } from "@/lib/character-db"
import type { LanguageId, RegionId } from "@/lib/languages"
import { authenticatedFetch } from "@/lib/supabase"
import type { CharacterRow } from "@/lib/workspace-types"
import { cn } from "@/lib/utils"

type BuilderMode = "prompt" | "upload"

type CharacterBuilderProps = {
  languageId: LanguageId
  regionId: RegionId
  workspaceId?: string
  workspaceContext?: { name: string; description?: string | null }
  onCreated: (characters: CharacterRow[]) => void
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

export function CharacterBuilder({
  languageId,
  regionId,
  workspaceId,
  workspaceContext,
  onCreated,
  onCancel,
}: CharacterBuilderProps) {
  const { hydrated } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<BuilderMode>("prompt")
  const [prompt, setPrompt] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [levelCount, setLevelCount] = useState(1)
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
        throw new Error("Describe the character you want to practice with")
      }

      const response = await authenticatedFetch("/api/character/generate", {
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
          workspaceId,
          levelCount,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to generate character")
      }

      const data = (await response.json()) as {
        characters?: GeneratedCharacterPayload[]
      }

      const payloads = data.characters ?? []

      if (payloads.length === 0) {
        throw new Error("No characters were generated")
      }

      const resolvedSourceLabel =
        sourceLabel ??
        (workspaceContext
          ? workspaceContext.name
          : sourceType === "prompt"
            ? "Custom prompt"
            : undefined)

      const characters = await Promise.all(
        payloads.map((payload) =>
          saveCharacter(
            generatedPayloadToCharacter(payload, {
              id: crypto.randomUUID(),
              languageId,
              sourceLabel: resolvedSourceLabel,
            }),
            workspaceId,
          ),
        ),
      )
      onCreated(characters)
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
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-black/20 ring-1 ring-border/50 dark:border-white/10 dark:bg-[#16181d] dark:text-white dark:ring-white/5">
        <div className="flex items-start justify-between gap-4 border-b p-6 dark:border-white/10">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.2em] text-lime-700 uppercase dark:text-lime-300">
              Custom character
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              Create your own practice
            </h2>
            <p className="text-sm text-muted-foreground dark:text-white/55">
              {workspaceContext
                ? `For workspace “${workspaceContext.name}” — from a prompt, course notes, or PDF upload.`
                : "From a prompt, course notes, or PDF upload."}
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
          <div className="flex gap-2 rounded-xl bg-muted p-1 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setMode("prompt")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                mode === "prompt"
                  ? "bg-background text-foreground shadow-sm dark:bg-lime-300 dark:text-black"
                  : "text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white",
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
                  ? "bg-background text-foreground shadow-sm dark:bg-lime-300 dark:text-black"
                  : "text-muted-foreground hover:text-foreground dark:text-white/50 dark:hover:text-white",
              )}
            >
              <Upload className="size-4" />
              Upload
            </button>
          </div>

          {mode === "prompt" ? (
            <div className="space-y-2">
              <label htmlFor="character-prompt" className="text-sm font-medium">
                Describe the character
              </label>
              <textarea
                id="character-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="e.g. I'm at a pharmacy trying to explain my symptoms and get the right medicine. The pharmacist is busy but helpful."
                rows={6}
                className="w-full resize-none rounded-2xl border bg-background px-4 py-3 text-sm ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-white/10 dark:bg-white/5"
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
                className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center transition-colors hover:border-lime-600/40 hover:bg-lime-600/5 dark:border-white/15 dark:bg-white/3 dark:hover:border-lime-300/40 dark:hover:bg-lime-300/5"
              >
                <FileText className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {uploadedFile
                      ? uploadedFile.name
                      : "Upload PDF or text file"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-white/50">
                    Course PDFs, lesson notes, .txt, or .md — up to 4 MB
                  </p>
                </div>
              </button>

              <div className="space-y-2">
                <label htmlFor="character-notes" className="text-sm font-medium">
                  Extra notes (optional)
                </label>
                <textarea
                  id="character-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Focus on hotel check-in vocabulary from chapter 3..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border bg-background px-4 py-3 text-sm ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-white/10 dark:bg-white/5"
                />
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-2xl border bg-muted/20 px-4 py-4 dark:border-white/10 dark:bg-white/3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="level-count" className="text-sm font-medium">
                Practice steps
              </label>
              <span className="text-sm font-semibold tabular-nums">
                {levelCount} {levelCount === 1 ? "step" : "steps"}
              </span>
            </div>
            <Slider
              id="level-count"
              min={1}
              max={10}
              step={1}
              value={[levelCount]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value
                setLevelCount(next ?? 1)
              }}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground dark:text-white/50">
              Each step becomes a node on the practice track, progressing from
              easier to harder
              {workspaceContext ? " in this workspace" : ""}.
            </p>
          </div>

          <ContentSafetyAttribution />

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t p-6 dark:border-white/10">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-lime-600 text-white hover:bg-lime-700 dark:bg-lime-300 dark:text-black dark:hover:bg-lime-200"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !hydrated}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles />
                Generate character
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
