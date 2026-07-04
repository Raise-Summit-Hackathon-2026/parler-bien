"use client"

import { useParams } from "next/navigation"

import { TrackPreviewPage } from "@/components/track-preview-page"
import { getTrack } from "@/lib/tracks"

export default function TrackPreviewRoute() {
  const params = useParams<{ trackId: string }>()
  const track = getTrack(params.trackId)

  return <TrackPreviewPage track={track} />
}
