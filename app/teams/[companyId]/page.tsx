"use client"

import { useParams, useRouter } from "next/navigation"

import { CompanyHubPage } from "@/components/company-hub"
import { getCompanyHub } from "@/lib/companies"
import type { LearningTrack } from "@/lib/tracks"

export default function CompanyPage() {
  const params = useParams<{ companyId: string }>()
  const router = useRouter()
  const hub = getCompanyHub(params.companyId)

  function handleSelectTrack(track: LearningTrack) {
    router.push(`/tracks/${track.id}`)
  }

  return (
    <CompanyHubPage
      hub={hub}
      onBack={() => router.push("/teams")}
      onSelectTrack={handleSelectTrack}
    />
  )
}
