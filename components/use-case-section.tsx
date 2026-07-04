"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

import type { UseCase } from "@/lib/use-cases"
import { cn } from "@/lib/utils"

type UseCaseSectionProps = {
  useCase: UseCase
  children?: React.ReactNode
  action?: React.ReactNode
}

export function UseCaseSection({ useCase, children, action }: UseCaseSectionProps) {
  const isComingSoon = useCase.status === "coming_soon"

  return (
    <section className="space-y-4" id={useCase.id}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
              {useCase.title}
            </h2>
            {isComingSoon && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Coming soon
              </span>
            )}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{useCase.description}</p>
          {useCase.href && (
            useCase.href.startsWith("/") ? (
              <Link
                href={useCase.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {useCase.hrefLabel ?? "Open"}
              </Link>
            ) : (
              <a
                href={useCase.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {useCase.hrefLabel ?? "Learn more"}
                <ExternalLink className="size-3" />
              </a>
            )
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ComingSoonCard({ useCase }: { useCase: UseCase }) {
  return (
    <div
      className={cn(
        "flex min-h-[140px] flex-col justify-center rounded-3xl border border-dashed bg-muted/20 p-6",
        "text-sm text-muted-foreground",
      )}
    >
      <p className="font-medium text-foreground">{useCase.title}</p>
      <p className="mt-2">{useCase.description}</p>
      {useCase.href && (
        <a
          href={useCase.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {useCase.hrefLabel ?? "Learn more"}
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  )
}

export function ScenarioGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  )
}

export function DemoPathLink() {
  return (
    <Link
      href="/demo"
      className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      Run 90s guided demo path →
    </Link>
  )
}
