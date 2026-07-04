"use client"

import { Menu } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { useLanguage } from "@/components/language-provider"
import { getLanguage, getRegion, LANGUAGES } from "@/lib/languages"
import { cn } from "@/lib/utils"

export function SettingsMenu() {
  const { languageId, regionId, setLanguageId, setRegionId, hydrated } =
    useLanguage()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const language = getLanguage(languageId)
  const region = getRegion(languageId, regionId)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md border bg-card text-foreground transition-colors hover:bg-muted/60"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Menu className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,18rem)] overflow-hidden rounded-xl border bg-popover p-4 shadow-lg">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Language
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLanguageId(item.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      languageId === item.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Accent
              </p>
              <div className="flex flex-col gap-1.5">
                {language.regions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRegionId(item.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      regionId === item.id
                        ? "border-foreground bg-muted font-medium"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-muted/40",
                    )}
                  >
                    <span>{item.label} · {item.city}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.accent}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {hydrated && (
              <p className="text-xs text-muted-foreground">
                Practicing {language.name} · {region.accent}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
