"use client"

import { useParams } from "next/navigation"

import { AuthGate } from "@/components/auth-gate"
import { WorkspaceDetailPage } from "@/components/workspace-detail-page"

export default function WorkspaceDetailRoute() {
  const params = useParams<{ workspaceId: string }>()

  return (
    <AuthGate>
      <WorkspaceDetailPage workspaceId={params.workspaceId} />
    </AuthGate>
  )
}
