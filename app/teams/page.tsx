"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { ScenarioScene } from "@/components/scenario-scene"
import { COMPANY_HUBS } from "@/lib/companies"
import { cn } from "@/lib/utils"

export default function TeamsIndexPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-sm text-muted-foreground">
          Choose a company team to explore department learning paths.
        </p>
      </div>

      <div className="space-y-4">
        {COMPANY_HUBS.map((hub) => (
          <Link
            key={hub.id}
            href={`/teams/${hub.id}`}
            className={cn(
              "group block overflow-hidden rounded-3xl border bg-card transition-all",
              "hover:border-foreground/20 hover:shadow-sm",
            )}
          >
            <div className="relative">
              <ScenarioScene imagePrompt={hub.imagePrompt} className="h-36 w-full" />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
              <div className="absolute right-0 bottom-0 left-0 flex items-end justify-between gap-3 p-5 text-white">
                <div>
                  <p className="text-xs font-medium tracking-wide uppercase opacity-80">
                    {hub.location}
                  </p>
                  <p className="text-xl font-semibold">{hub.name}</p>
                </div>
                <ChevronRight className="size-5 opacity-80 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
            <p className="p-4 text-sm text-muted-foreground">{hub.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
