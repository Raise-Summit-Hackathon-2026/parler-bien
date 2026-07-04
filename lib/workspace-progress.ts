import { getSupabaseBrowserClient } from "@/lib/supabase"
import type {
  LevelStatus,
  PassCriteria,
  WorkspaceLevelProgressRow,
  WorkspaceLevelRow,
} from "@/lib/workspace-types"
import { getPlayableLevels } from "@/lib/workspace-types"

export async function fetchLevelProgress(
  levelIds: string[],
): Promise<Record<string, WorkspaceLevelProgressRow>> {
  if (levelIds.length === 0) return {}

  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}

  const { data, error } = await supabase
    .from("workspace_level_progress")
    .select("*")
    .eq("user_id", user.id)
    .in("level_id", levelIds)

  if (error) throw error

  const map: Record<string, WorkspaceLevelProgressRow> = {}
  for (const row of (data ?? []) as WorkspaceLevelProgressRow[]) {
    map[row.level_id] = row
  }
  return map
}

export function getLevelStatusFromProgress(
  level: WorkspaceLevelRow,
  progress: Record<string, WorkspaceLevelProgressRow>,
  playableLevels: WorkspaceLevelRow[],
): LevelStatus {
  if (level.status === "draft") return "draft"

  const row = progress[level.id]
  if (row?.status === "completed") return "completed"
  if (row?.status === "in_progress") return "in_progress"

  const playable = getPlayableLevels(playableLevels)
  const index = playable.findIndex((l) => l.id === level.id)
  if (index === -1) return "locked"

  if (index === 0) return row?.status === "available" ? "available" : "available"

  const prev = playable[index - 1]
  const prevProgress = progress[prev.id]
  if (prevProgress?.status === "completed") {
    return row?.status ?? "available"
  }

  return "locked"
}

export async function markLevelInProgress(levelId: string) {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from("workspace_level_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("level_id", levelId)
    .maybeSingle()

  const row = existing as WorkspaceLevelProgressRow | null
  if (row?.status === "completed") return

  if (row) {
    await supabase
      .from("workspace_level_progress")
      .update({
        status: "in_progress",
        attempts: row.attempts + 1,
      })
      .eq("id", row.id)
    return
  }

  await supabase.from("workspace_level_progress").insert({
    user_id: user.id,
    level_id: levelId,
    status: "in_progress",
    attempts: 1,
  })
}

export async function markLevelCompleted(
  levelId: string,
  trackLevels: WorkspaceLevelRow[],
  bestScore?: number,
) {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from("workspace_level_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("level_id", levelId)
    .maybeSingle()

  const row = existing as WorkspaceLevelProgressRow | null
  const nextBest =
    bestScore !== undefined
      ? Math.max(bestScore, row?.best_score ?? 0)
      : row?.best_score ?? null

  if (row) {
    await supabase
      .from("workspace_level_progress")
      .update({
        status: "completed",
        best_score: nextBest,
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id)
  } else {
    await supabase.from("workspace_level_progress").insert({
      user_id: user.id,
      level_id: levelId,
      status: "completed",
      best_score: nextBest,
      attempts: 1,
      completed_at: new Date().toISOString(),
    })
  }

  const playable = getPlayableLevels(trackLevels)
  const currentIndex = playable.findIndex((l) => l.id === levelId)
  const nextLevel = playable[currentIndex + 1]
  if (!nextLevel) return

  const { data: nextExisting } = await supabase
    .from("workspace_level_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("level_id", nextLevel.id)
    .maybeSingle()

  const nextRow = nextExisting as WorkspaceLevelProgressRow | null
  if (nextRow?.status === "completed") return

  if (nextRow) {
    await supabase
      .from("workspace_level_progress")
      .update({ status: "available" })
      .eq("id", nextRow.id)
  } else {
    await supabase.from("workspace_level_progress").insert({
      user_id: user.id,
      level_id: nextLevel.id,
      status: "available",
      attempts: 0,
    })
  }
}

export function checkLevelWin(
  passCriteria: PassCriteria,
  result: {
    overall_score?: number
    goal_achieved?: boolean
    meter?: number
  },
  turnCount: number,
): boolean {
  switch (passCriteria.type) {
    case "pronunciation":
      return (result.overall_score ?? 0) >= passCriteria.minScore
    case "goal":
      return (
        result.goal_achieved === true ||
        (result.meter ?? 0) >= (passCriteria.minMeter ?? 95)
      )
    case "complete":
      return turnCount >= passCriteria.minTurns
    case "gesture":
      return false
  }
}
