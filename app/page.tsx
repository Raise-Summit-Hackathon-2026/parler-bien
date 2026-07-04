"use client"

import { FreePlaySection } from "@/components/free-play-section"
import {
  HomeHero,
  TeamsSection,
  TracksSection,
  WorkspacesCta,
} from "@/components/track-catalogue"

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <TracksSection />
      <TeamsSection />
      <FreePlaySection />
      <WorkspacesCta />
    </>
  )
}
