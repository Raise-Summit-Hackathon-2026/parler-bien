"use client"

import { useRouter } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { WorkspaceDashboard } from "@/components/workspace-dashboard"

export default function WorkspacesPage() {
  const router = useRouter()

  return (
    <AuthGate>
      <WorkspaceDashboard onBack={() => router.push("/")} />
    </AuthGate>
  )
}
