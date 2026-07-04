"use client"

import { useParams, useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { LevelPath } from "@/components/level-path"
import { trackBackHref } from "@/lib/track-navigation"
import { getLevelStatus } from "@/lib/track-progress"
import { getTrack } from "@/lib/tracks"

export default function TrackPathPage() {
  const params = useParams<{ trackId: string }>()
  const router = useRouter()
  const track = getTrack(params.trackId)

  return (
    <AuthGate>
      <LevelPath
        track={track}
        onBack={() => router.push(trackBackHref(track))}
        onSelectLevel={(level) => {
          const status = getLevelStatus(track.id, level.id)
          if (status === "wip" || status === "locked") return
          router.push(`/tracks/${track.id}/levels/${level.id}`)
        }}
      />
    </AuthGate>
  )
}
