"use client"

import { Plus, Trash2 } from "lucide-react"
import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  AGENT_CAPABILITY_OPTIONS,
  type AgentCapability,
  type AgentSkill,
  type AgentType,
} from "@/lib/agents"
import type { WorkspacePersonaRow } from "@/lib/workspace-types"

export type PersonaFormValues = {
  name: string
  role_title: string
  tagline: string
  agent_type: AgentType
  capabilities: AgentCapability[]
  voice_age_range: string
  voice_gender: "male" | "female" | "random" | "opposite-speaker"
  voice_tone: string
  delivery_style: string
  coaching_style: string
  skills: AgentSkill[]
  preview_script: string
  persona_base: string
  instructions: string
  avatar_prompt: string
  greeting: string
  theme_color: string
}

export function personaToFormValues(persona?: WorkspacePersonaRow): PersonaFormValues {
  return {
    name: persona?.name ?? "",
    role_title: persona?.role_title ?? "",
    tagline: persona?.tagline ?? "",
    agent_type: persona?.agent_type ?? "roleplay",
    capabilities: persona?.capabilities ?? ["goal_meter", "goal_completion"],
    voice_age_range: persona?.voice_age_range ?? "30-40",
    voice_gender: persona?.voice_gender ?? "random",
    voice_tone: persona?.voice_tone ?? "",
    delivery_style: persona?.delivery_style ?? "",
    coaching_style: persona?.coaching_style ?? "",
    skills: persona?.skills ?? [],
    preview_script: persona?.preview_script ?? "",
    persona_base: persona?.persona_base ?? persona?.instructions ?? "",
    instructions: persona?.instructions ?? "",
    avatar_prompt: persona?.avatar_prompt ?? "",
    greeting: persona?.greeting ?? "",
    theme_color: persona?.theme_color ?? "#3b82f6",
  }
}

type PersonaEditorFormProps = {
  initial?: WorkspacePersonaRow
  onSubmit: (values: PersonaFormValues) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const inputClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
const textareaClass =
  "w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

export function PersonaEditorForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save persona",
}: PersonaEditorFormProps) {
  const [values, setValues] = useState<PersonaFormValues>(() =>
    personaToFormValues(initial),
  )
  const [busy, setBusy] = useState(false)

  function update<K extends keyof PersonaFormValues>(key: K, value: PersonaFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function toggleCapability(cap: AgentCapability) {
    setValues((current) => ({
      ...current,
      capabilities: current.capabilities.includes(cap)
        ? current.capabilities.filter((c) => c !== cap)
        : [...current.capabilities, cap],
    }))
  }

  function updateSkill(index: number, patch: Partial<AgentSkill>) {
    setValues((current) => ({
      ...current,
      skills: current.skills.map((skill, i) =>
        i === index ? { ...skill, ...patch } : skill,
      ),
    }))
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

  const capabilityOptions = AGENT_CAPABILITY_OPTIONS.filter((opt) =>
    opt.forTypes.includes(values.agent_type),
  )

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-3">
        <h3 className="font-semibold">1. Identity</h3>
        <input
          className={inputClass}
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Persona name"
          required
        />
        <input
          className={inputClass}
          value={values.role_title}
          onChange={(e) => update("role_title", e.target.value)}
          placeholder="Role or department"
        />
        <input
          className={inputClass}
          value={values.tagline}
          onChange={(e) => update("tagline", e.target.value)}
          placeholder="Tagline shown in previews"
        />
        <input
          className={inputClass}
          value={values.avatar_prompt}
          onChange={(e) => update("avatar_prompt", e.target.value)}
          placeholder="Avatar / scene image prompt"
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">2. Agent type & capabilities</h3>
        <select
          className={inputClass}
          value={values.agent_type}
          onChange={(e) => update("agent_type", e.target.value as AgentType)}
        >
          <option value="language">Language coach</option>
          <option value="roleplay">Roleplay</option>
          <option value="spiritual">Spiritual / reflection</option>
        </select>
        <div className="flex flex-wrap gap-2">
          {capabilityOptions.map((opt) => (
            <label
              key={opt.id}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
            >
              <input
                type="checkbox"
                checked={values.capabilities.includes(opt.id)}
                onChange={() => toggleCapability(opt.id)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">3. Voice</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputClass}
            value={values.voice_age_range}
            onChange={(e) => update("voice_age_range", e.target.value)}
            placeholder="Age range (e.g. 30-40)"
          />
          <select
            className={inputClass}
            value={values.voice_gender}
            onChange={(e) =>
              update(
                "voice_gender",
                e.target.value as PersonaFormValues["voice_gender"],
              )
            }
          >
            <option value="random">Random gender</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="opposite-speaker">Opposite speaker</option>
          </select>
        </div>
        <textarea
          className={textareaClass}
          rows={2}
          value={values.voice_tone}
          onChange={(e) => update("voice_tone", e.target.value)}
          placeholder="Voice tone description"
        />
        <textarea
          className={textareaClass}
          rows={2}
          value={values.delivery_style}
          onChange={(e) => update("delivery_style", e.target.value)}
          placeholder="Delivery style (whisper, PA voice, sigh, etc.)"
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">4. Coaching & persona</h3>
        <textarea
          className={textareaClass}
          rows={3}
          value={values.coaching_style}
          onChange={(e) => update("coaching_style", e.target.value)}
          placeholder="How this persona gives feedback"
        />
        <textarea
          className={textareaClass}
          rows={5}
          value={values.persona_base}
          onChange={(e) => update("persona_base", e.target.value)}
          placeholder="Base persona instructions (meter rules, character behavior)"
          required
        />
        <textarea
          className={textareaClass}
          rows={2}
          value={values.preview_script}
          onChange={(e) => update("preview_script", e.target.value)}
          placeholder="Voice preview script"
        />
        <input
          className={inputClass}
          value={values.greeting}
          onChange={(e) => update("greeting", e.target.value)}
          placeholder="Optional greeting line"
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">5. Skills</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              update("skills", [
                ...values.skills,
                { id: `skill-${Date.now()}`, label: "", description: "" },
              ])
            }
          >
            <Plus />
            Add skill
          </Button>
        </div>
        {values.skills.map((skill, index) => (
          <div key={skill.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className={inputClass}
              value={skill.label}
              onChange={(e) => updateSkill(index, { label: e.target.value })}
              placeholder="Skill label"
            />
            <input
              className={inputClass}
              value={skill.description}
              onChange={(e) => updateSkill(index, { description: e.target.value })}
              placeholder="Description"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                update(
                  "skills",
                  values.skills.filter((_, i) => i !== index),
                )
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">6. Theme</h3>
        <input
          className={inputClass}
          value={values.theme_color}
          onChange={(e) => update("theme_color", e.target.value)}
          placeholder="#3b82f6"
        />
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {submitLabel}
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
