"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { AuthStatus } from "@/components/auth-status"
import { SettingsMenu } from "@/components/settings-menu"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/workspaces", label: "Workspaces" },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75 dark:border-white/10 dark:bg-[#05070a]/85">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Parler Bien
          <span className="ml-1 text-lime-600 dark:text-lime-300">↗</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-lime-600/10 text-lime-700 dark:bg-lime-300/10 dark:text-lime-300"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <AuthStatus />
          <SettingsMenu />
        </div>
      </div>
    </header>
  )
}
