"use client"

import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_REGION_ID,
  LANGUAGES,
  type LanguageId,
  type RegionId,
} from "@/lib/languages"
import { cn } from "@/lib/utils"

type LanguagePickerProps = {
  languageId: LanguageId
  regionId: RegionId
  onLanguageChange: (languageId: LanguageId) => void
  onRegionChange: (regionId: RegionId) => void
  className?: string
}

export function LanguagePicker({
  languageId,
  regionId,
  onLanguageChange,
  onRegionChange,
  className,
}: LanguagePickerProps) {
  const language = LANGUAGES.find((l) => l.id === languageId) ?? LANGUAGES[0]

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap justify-center gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            type="button"
            onClick={() => onLanguageChange(lang.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              languageId === lang.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {lang.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {language.regions.map((region) => (
          <button
            key={region.id}
            type="button"
            onClick={() => onRegionChange(region.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              regionId === region.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/30",
            )}
          >
            {region.label} · {region.city}
          </button>
        ))}
      </div>
    </div>
  )
}

export { DEFAULT_LANGUAGE_ID, DEFAULT_REGION_ID }
