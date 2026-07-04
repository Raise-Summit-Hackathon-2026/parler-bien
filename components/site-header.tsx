"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { AuthStatus } from "@/components/auth-status"
import { useLanguage } from "@/components/language-provider"
import { LANGUAGES, type LanguageId } from "@/lib/languages"
import { cn } from "@/lib/utils"

const HEADER_LANGUAGES = LANGUAGES.filter((language) =>
  (["fr", "en", "es"] as LanguageId[]).includes(language.id),
)

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#free-play", label: "Free Play" },
  { href: "/teams", label: "Teams" },
  { href: "/workspaces", label: "Workspaces" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const { languageId, setLanguageId } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentLanguage =
    HEADER_LANGUAGES.find((language) => language.id === languageId) ??
    HEADER_LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Parler Bien
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href.startsWith("/#")
                  ? pathname === "/"
                  : pathname.startsWith(link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <AuthStatus />

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/60"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
            >
              {currentLanguage.name}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div
                role="listbox"
                className="absolute right-0 mt-2 min-w-[9rem] overflow-hidden rounded-md border bg-popover p-1 shadow-md"
              >
                {HEADER_LANGUAGES.map((language) => (
                  <button
                    key={language.id}
                    type="button"
                    role="option"
                    aria-selected={languageId === language.id}
                    onClick={() => {
                      setLanguageId(language.id)
                      setMenuOpen(false)
                    }}
                    className={cn(
                      "flex w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                      languageId === language.id && "bg-muted font-medium",
                    )}
                  >
                    {language.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
