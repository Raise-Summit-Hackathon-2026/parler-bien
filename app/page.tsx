"use client"

import { FreePlaySection } from "@/components/free-play-section"
import { HomeHero, WorkspacesCta } from "@/components/home-hero"

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <FreePlaySection />
      <WorkspacesCta />
    </>
  )
}
