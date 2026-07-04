"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { GestureSession } from "@/components/gesture-session"
import { PracticeSession } from "@/components/practice-session"
import { useLanguage } from "@/components/language-provider"
import {
  buildLevelScenario,
  levelLanguage,
  type LevelContext,
} from "@/lib/level-scenario"
import { personaToVoiceAgent } from "@/lib/workspace-persona"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import {
  isGestureLevel,
  type WorkspaceLevelRow,
  type WorkspacePersonaRow,
  type WorkspaceTrackRow,
} from "@/lib/workspace-types"

export default function WorkspaceLevelPlayPage() {
  const params = useParams<{
    workspaceId: string
    trackId: string
    levelId: string
  }>()
  const router = useRouter()
  const { languageId } = useLanguage()
  const [track, setTrack] = useState<WorkspaceTrackRow | null>(null)
  const [levels, setLevels] = useState<WorkspaceLevelRow[]>([])
  const [level, setLevel] = useState<WorkspaceLevelRow | null>(null)
  const [persona, setPersona] = useState<WorkspacePersonaRow | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient()
      const [trackRes, levelsRes, levelRes] = await Promise.all([
        supabase.from("workspace_tracks").select("*").eq("id", params.trackId).single(),
        supabase
          .from("workspace_levels")
          .select("*")
          .eq("track_id", params.trackId)
          .order("position"),
        supabase.from("workspace_levels").select("*").eq("id", params.levelId).single(),
      ])
      if (trackRes.error) throw trackRes.error
      if (levelsRes.error) throw levelsRes.error
      if (levelRes.error) throw levelRes.error

      const trackRow = trackRes.data as WorkspaceTrackRow
      setTrack(trackRow)
      setLevels((levelsRes.data ?? []) as WorkspaceLevelRow[])
      setLevel(levelRes.data as WorkspaceLevelRow)

      const { data: personaRow, error: personaError } = await supabase
        .from("workspace_personas")
        .select("*")
        .eq("id", trackRow.persona_id)
        .single()
      if (personaError) throw personaError
      setPersona(personaRow as WorkspacePersonaRow)
    }

    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load level"),
    )
  }, [params.trackId, params.levelId])

  const handleLevelComplete = useCallback(() => {
    router.push(`/workspaces/${params.workspaceId}/tracks/${params.trackId}`)
  }, [router, params.workspaceId, params.trackId])

  if (error) {
    return <p className="px-6 py-12 text-sm text-destructive">{error}</p>
  }

  if (!track || !level || !persona) {
    return <p className="px-6 py-12 text-sm text-muted-foreground">Loading session…</p>
  }

  const agent = personaToVoiceAgent(persona)
  const scenarioLang = levelLanguage(level, languageId)

  const levelContext: LevelContext = {
    workspaceId: params.workspaceId,
    trackId: track.id,
    levelId: level.id,
    level,
    trackLevels: levels,
    agent,
    passCriteria: level.pass_criteria,
    onLevelComplete: handleLevelComplete,
  }

  if (isGestureLevel(level)) {
    const criteria = level.pass_criteria
    if (criteria.type !== "gesture") return null

    return (
      <AuthGate>
        <GestureSession
          agent={agent}
          steps={criteria.steps}
          holdMs={criteria.holdMs}
          winMessage={level.room.winMessage ?? "Level complete!"}
          levelContext={levelContext}
          onBack={() =>
            router.push(`/workspaces/${params.workspaceId}/tracks/${params.trackId}`)
          }
        />
      </AuthGate>
    )
  }

  const scenario = buildLevelScenario(level, agent, scenarioLang)

  return (
    <AuthGate>
      <PracticeSession
        key={`${level.id}-${scenarioLang}`}
        scenario={scenario}
        onBack={() =>
          router.push(`/workspaces/${params.workspaceId}/tracks/${params.trackId}`)
        }
        levelContext={levelContext}
      />
    </AuthGate>
  )
}
