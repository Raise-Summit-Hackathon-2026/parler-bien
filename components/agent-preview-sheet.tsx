"use client"

import { Loader2, Play, Volume2, X } from "lucide-react"
import { useEffect } from "react"

import { ScenarioScene } from "@/components/scenario-scene"
import { Button } from "@/components/ui/button"
import { Waveform } from "@/components/waveform"
import { useSpeaker } from "@/hooks/use-speaker"
import { getAgent, getAgentTypeLabel } from "@/lib/agents"
import { getRegion, type LanguageId, type RegionId } from "@/lib/languages"
import type { LearningTrack } from "@/lib/tracks"

type AgentPreviewSheetProps = {
  track: LearningTrack
  languageId: LanguageId
  regionId: RegionId
  onStart: () => void
  onClose: () => void
}

export function AgentPreviewSheet({
  track,
  languageId,
  regionId,
  onStart,
  onClose,
}: AgentPreviewSheetProps) {
  const agent = getAgent(track.primaryAgentId)
  const region = getRegion(languageId, regionId)
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close preview"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border bg-card shadow-xl sm:rounded-3xl">
        <div className="relative">
          <ScenarioScene
            imagePrompt={agent.avatarPrompt}
            className="h-44 w-full rounded-none sm:rounded-t-3xl"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3 bg-black/40 text-white hover:bg-black/60"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
          <span
            className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            style={{ backgroundColor: `${track.themeColor}cc` }}
          >
            {getAgentTypeLabel(agent.type)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {track.title}
            </p>
            <h2 className="text-2xl font-semibold">{agent.name}</h2>
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
            <Button
              variant="outline"
              className="w-full"
              onClick={handlePlayPreview}
            >
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

          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              stop()
              onStart()
            }}
          >
            <Volume2 className="size-4" />
            Start track
          </Button>
        </div>
      </div>
    </div>
  )
}
