import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type CinematicPageShellProps = {
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function CinematicPageShell({
  children,
  className,
  contentClassName,
}: CinematicPageShellProps) {
  return (
    <main
      className={cn(
        "relative min-h-svh overflow-hidden bg-background text-foreground dark:bg-[#05070a] dark:text-white",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 18% 24%, rgba(132, 204, 22, 0.14), transparent 25%), radial-gradient(circle at 82% 28%, rgba(132, 204, 22, 0.08), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 35%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-80 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          maskImage:
            "linear-gradient(to top, black, transparent), radial-gradient(ellipse at center, black 0%, transparent 68%)",
        }}
        aria-hidden
      />
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-7xl flex-col px-6 py-10",
          contentClassName,
        )}
      >
        {children}
      </div>
    </main>
  )
}
