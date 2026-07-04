"use client"

import { useLanguage } from "@/components/language-provider"
import { getLanguage, getRegion, type RegionId } from "@/lib/languages"
import { cn } from "@/lib/utils"

export function RegionPicker({ className }: { className?: string }) {
  const { languageId, regionId, setRegionId } = useLanguage()
  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {language.regions.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => setRegionId(r.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            regionId === r.id
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/30",
          )}
        >
          {r.label} · {r.city}
        </button>
      ))}
      <span className="text-xs text-muted-foreground">{region.accent}</span>
    </div>
  )
}
