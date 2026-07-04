"use client"

import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ScenarioBackButton({
  onBack,
  label = "Scenarios",
}: {
  onBack: () => void
  label?: string
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
      <ArrowLeft />
      {label}
    </Button>
  )
}
