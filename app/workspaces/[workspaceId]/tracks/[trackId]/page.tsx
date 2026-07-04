"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { WorkspaceLevelPath } from "@/components/workspace-level-path"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { WorkspaceLevelRow, WorkspaceTrackRow } from "@/lib/workspace-types"

export default function WorkspaceTrackPathPage() {
  const params = useParams<{ workspaceId: string; trackId: string }>()
  const [track, setTrack] = useState<WorkspaceTrackRow | null>(null)
  const [levels, setLevels] = useState<WorkspaceLevelRow[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient()
      const [trackRes, levelsRes] = await Promise.all([
        supabase.from("workspace_tracks").select("*").eq("id", params.trackId).single(),
        supabase
          .from("workspace_levels")
          .select("*")
          .eq("track_id", params.trackId)
          .order("position"),
      ])
      if (trackRes.error) throw trackRes.error
      if (levelsRes.error) throw levelsRes.error
      setTrack(trackRes.data as WorkspaceTrackRow)
      setLevels((levelsRes.data ?? []) as WorkspaceLevelRow[])
    }

    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load track"),
    )
  }, [params.trackId])

  if (error) {
    return <p className="px-6 py-12 text-sm text-destructive">{error}</p>
  }

  if (!track) {
    return <p className="px-6 py-12 text-sm text-muted-foreground">Loading track…</p>
  }

  return (
    <AuthGate>
      <WorkspaceLevelPath
        workspaceId={params.workspaceId}
        track={track}
        levels={levels}
      />
    </AuthGate>
  )
}
