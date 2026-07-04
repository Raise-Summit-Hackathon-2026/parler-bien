"use client"

import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { GESTURE_PRESETS } from "@/lib/glaf-template"
import { LANGUAGES, type LanguageId, type RegionId } from "@/lib/languages"
import type { LevelRoom, PassCriteria, WorkspaceLevelRow } from "@/lib/workspace-types"

export type LevelFormValues = {
  position: number
  title: string
  subtitle: string
  status: "playable" | "draft"
  pass_criteria: PassCriteria
  room: LevelRoom
  language_id: LanguageId
  region_id: RegionId
}

export function levelToFormValues(
  level?: WorkspaceLevelRow,
  nextPosition = 1,
): LevelFormValues {
  return {
    position: level?.position ?? nextPosition,
    title: level?.title ?? "",
    subtitle: level?.subtitle ?? "",
    status: level?.status ?? "playable",
    pass_criteria: level?.pass_criteria ?? { type: "goal" },
    room: level?.room ?? {},
    language_id: level?.language_id ?? "fr",
    region_id: level?.region_id ?? "fr-FR",
  }
}

type LevelEditorFormProps = {
  initial?: WorkspaceLevelRow
  nextPosition?: number
  onSubmit: (values: LevelFormValues) => Promise<void>
  onCancel?: () => void
}

const inputClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
const textareaClass =
  "w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

export function LevelEditorForm({
  initial,
  nextPosition = 1,
  onSubmit,
  onCancel,
}: LevelEditorFormProps) {
  const [values, setValues] = useState<LevelFormValues>(() =>
    levelToFormValues(initial, nextPosition),
  )
  const [busy, setBusy] = useState(false)

  const language = LANGUAGES.find((l) => l.id === values.language_id) ?? LANGUAGES[0]

  function updateRoom(patch: Partial<LevelRoom>) {
    setValues((current) => ({ ...current, room: { ...current.room, ...patch } }))
  }

  function setPassType(type: PassCriteria["type"]) {
    switch (type) {
      case "pronunciation":
        setValues((c) => ({
          ...c,
          pass_criteria: { type: "pronunciation", minScore: 70 },
        }))
        break
      case "goal":
        setValues((c) => ({ ...c, pass_criteria: { type: "goal" } }))
        break
      case "complete":
        setValues((c) => ({
          ...c,
          pass_criteria: { type: "complete", minTurns: 3 },
        }))
        break
      case "gesture":
        setValues((c) => ({
          ...c,
          pass_criteria: {
            type: "gesture",
            steps: GESTURE_PRESETS.cabin_safety,
            holdMs: 1400,
          },
        }))
        break
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit(values)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-3">
        <h3 className="font-semibold">Level basics</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            type="number"
            min={1}
            value={values.position}
            onChange={(e) =>
              setValues((c) => ({ ...c, position: Number(e.target.value) }))
            }
          />
          <select
            className={inputClass}
            value={values.status}
            onChange={(e) =>
              setValues((c) => ({
                ...c,
                status: e.target.value as "playable" | "draft",
              }))
            }
          >
            <option value="playable">Playable</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <input
          className={inputClass}
          value={values.title}
          onChange={(e) => setValues((c) => ({ ...c, title: e.target.value }))}
          placeholder="Level title"
          required
        />
        <input
          className={inputClass}
          value={values.subtitle}
          onChange={(e) => setValues((c) => ({ ...c, subtitle: e.target.value }))}
          placeholder="Subtitle"
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Pass criteria</h3>
        <select
          className={inputClass}
          value={values.pass_criteria.type}
          onChange={(e) => setPassType(e.target.value as PassCriteria["type"])}
        >
          <option value="goal">Goal meter / roleplay win</option>
          <option value="pronunciation">Pronunciation score</option>
          <option value="complete">Conversation turns</option>
          <option value="gesture">Gesture sequence</option>
        </select>
        {values.pass_criteria.type === "pronunciation" && (
          <input
            className={inputClass}
            type="number"
            min={0}
            max={100}
            value={values.pass_criteria.minScore}
            onChange={(e) =>
              setValues((c) => ({
                ...c,
                pass_criteria: {
                  type: "pronunciation",
                  minScore: Number(e.target.value),
                },
              }))
            }
            placeholder="Minimum score"
          />
        )}
        {values.pass_criteria.type === "complete" && (
          <input
            className={inputClass}
            type="number"
            min={1}
            value={values.pass_criteria.minTurns}
            onChange={(e) =>
              setValues((c) => ({
                ...c,
                pass_criteria: {
                  type: "complete",
                  minTurns: Number(e.target.value),
                },
              }))
            }
            placeholder="Minimum turns"
          />
        )}
        {values.pass_criteria.type === "gesture" && (
          <p className="text-sm text-muted-foreground">
            Uses cabin safety gesture preset (seatbelt → point exit → palms down).
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Room / scenario</h3>
        <input
          className={inputClass}
          value={values.room.targetPhrase ?? ""}
          onChange={(e) => updateRoom({ targetPhrase: e.target.value || undefined })}
          placeholder="Target phrase (pronunciation levels)"
        />
        <input
          className={inputClass}
          value={values.room.goal ?? ""}
          onChange={(e) => updateRoom({ goal: e.target.value || null })}
          placeholder="Goal"
        />
        <input
          className={inputClass}
          value={values.room.meterLabel ?? ""}
          onChange={(e) => updateRoom({ meterLabel: e.target.value || null })}
          placeholder="Meter label"
        />
        <input
          className={inputClass}
          value={values.room.winMessage ?? ""}
          onChange={(e) => updateRoom({ winMessage: e.target.value || null })}
          placeholder="Win message"
        />
        <input
          className={inputClass}
          value={values.room.openingLine?.text ?? ""}
          onChange={(e) =>
            updateRoom({
              openingLine: e.target.value
                ? {
                    text: e.target.value,
                    hint: values.room.openingLine?.hint ?? "",
                  }
                : undefined,
            })
          }
          placeholder="Opening line"
        />
        <input
          className={inputClass}
          value={values.room.openingLine?.hint ?? ""}
          onChange={(e) =>
            updateRoom({
              openingLine: values.room.openingLine?.text
                ? {
                    text: values.room.openingLine.text,
                    hint: e.target.value,
                  }
                : undefined,
            })
          }
          placeholder="Opening line hint (English)"
        />
        <textarea
          className={textareaClass}
          rows={4}
          value={values.room.customPersonaOverlay ?? ""}
          onChange={(e) =>
            updateRoom({ customPersonaOverlay: e.target.value || undefined })
          }
          placeholder="Custom persona overlay (scenario-specific instructions)"
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Language override</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className={inputClass}
            value={values.language_id}
            onChange={(e) => {
              const lang = LANGUAGES.find((l) => l.id === e.target.value)
              setValues((c) => ({
                ...c,
                language_id: e.target.value as LanguageId,
                region_id: lang?.regions[0]?.id ?? c.region_id,
              }))
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={values.region_id}
            onChange={(e) =>
              setValues((c) => ({ ...c, region_id: e.target.value as RegionId }))
            }
          >
            {language.regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          Save level
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
