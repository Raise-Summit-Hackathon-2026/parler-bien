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
        className="inline-flex size-9 items-center justify-center rounded-xl border bg-card text-foreground transition-colors hover:bg-muted/60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Menu className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,18rem)] overflow-hidden rounded-2xl border bg-popover p-4 shadow-2xl dark:border-white/10 dark:bg-[#16181d] dark:text-white">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Practice language
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
                        ? "bg-lime-600 text-white dark:bg-lime-300 dark:text-black"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white",
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
                        ? "border-lime-600/40 bg-lime-600/10 font-medium text-lime-800 dark:border-lime-300/40 dark:bg-lime-300/10 dark:text-lime-200"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-muted/40 dark:border-white/10 dark:text-white/50 dark:hover:border-white/25 dark:hover:bg-white/5 dark:hover:text-white",
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
