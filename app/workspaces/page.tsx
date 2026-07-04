"use client"

import { AuthGate } from "@/components/auth-gate"
import { WorkspaceListPage } from "@/components/workspace-list-page"

export default function WorkspacesPage() {
  return (
    <AuthGate>
      <WorkspaceListPage />
    </AuthGate>
  )
}
