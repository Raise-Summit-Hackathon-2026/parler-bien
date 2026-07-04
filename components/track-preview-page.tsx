"use client"

import { ArrowLeft, Loader2, Play, Volume2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { useLanguage } from "@/components/language-provider"
import { ScenarioScene } from "@/components/scenario-scene"
import { Button } from "@/components/ui/button"
import { Waveform } from "@/components/waveform"
import { useSpeaker } from "@/hooks/use-speaker"
import { getAgent, getAgentTypeLabel } from "@/lib/agents"
import { getRegion } from "@/lib/languages"
import { scenarioLanguageForTrack, trackBackHref } from "@/lib/track-navigation"
import type { LearningTrack } from "@/lib/tracks"

type TrackPreviewPageProps = {
  track: LearningTrack
}

export function TrackPreviewPage({ track }: TrackPreviewPageProps) {
  const router = useRouter()
  const { languageId, regionId } = useLanguage()
  const scenarioLanguage = scenarioLanguageForTrack(track, languageId)
  const agent = getAgent(track.primaryAgentId)
  const region = getRegion(scenarioLanguage, regionId)
  const { isSpeaking, analyser, speak, stop } = useSpeaker()

  useEffect(() => {
    return () => stop()
  }, [stop])

  function handlePlayPreview() {
    if (isSpeaking) {
      stop()
      return
    }
    void speak(agent.previewScript, "character", {
      gender: "female",
      ageRange: agent.voice.ageRange,
      tone: agent.voice.tone,
      accent: region.accent,
      deliveryStyle: agent.deliveryStyle,
    })
  }

  function handleStart() {
    stop()
    router.push(`/tracks/${track.id}/path`)
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10">
      <Link
        href={trackBackHref(track)}
        className="inline-flex h-7 items-center gap-1 self-start rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </Link>

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative">
          <ScenarioScene
            imagePrompt={agent.avatarPrompt}
            className="h-44 w-full rounded-none"
          />
          <span
            className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            style={{ backgroundColor: `${track.themeColor}cc` }}
          >
            {getAgentTypeLabel(agent.type)}
          </span>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {track.title}
            </p>
            <h1 className="text-2xl font-semibold">{agent.name}</h1>
            <p className="text-muted-foreground">{agent.tagline}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Skills you&apos;ll practice</p>
            <ul className="space-y-2">
              {agent.skills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-2xl border bg-muted/30 px-4 py-3"
                >
                  <p className="text-sm font-medium">{skill.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {skill.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border bg-primary/5 p-4">
            <p className="text-sm font-medium">Voice preview</p>
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{agent.previewScript}&rdquo;
            </p>
            <Waveform analyser={analyser} active={isSpeaking} className="h-12" />
            <Button variant="outline" className="w-full" onClick={handlePlayPreview}>
              {isSpeaking ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Playing…
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Hear {agent.name}
                </>
              )}
            </Button>
          </div>

          <Button className="w-full" size="lg" onClick={handleStart}>
            <Volume2 className="size-4" />
            Start track
          </Button>
        </div>
      </div>
    </div>
  )
}
