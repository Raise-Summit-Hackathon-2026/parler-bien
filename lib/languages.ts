export type LanguageId = "fr" | "en" | "es" | "ru"

export type RegionId =
  | "fr-FR"
  | "fr-CA"
  | "en-US"
  | "en-GB"
  | "es-ES"
  | "es-MX"
  | "ru-RU"
  | "ru-SP"

export type Region = {
  id: RegionId
  label: string
  city: string
  /** Accent description used in TTS performance notes and scoring prompts, e.g. "Parisian French" */
  accent: string
}

export type Language = {
  id: LanguageId
  /** Display + prompt name, e.g. "French" */
  name: string
  regions: Region[]
}

export const LANGUAGES: Language[] = [
  {
    id: "en",
    name: "English",
    regions: [
      { id: "en-US", label: "United States", city: "New York", accent: "American English" },
      { id: "en-GB", label: "United Kingdom", city: "London", accent: "British English" },
    ],
  },
  {
    id: "fr",
    name: "French",
    regions: [
      { id: "fr-FR", label: "France", city: "Paris", accent: "Parisian French" },
      { id: "fr-CA", label: "Québec", city: "Montréal", accent: "Québécois French" },
    ],
  },
  {
    id: "es",
    name: "Spanish",
    regions: [
      { id: "es-ES", label: "Spain", city: "Madrid", accent: "Castilian Spanish" },
      { id: "es-MX", label: "Mexico", city: "Mexico City", accent: "Mexican Spanish" },
    ],
  },
  {
    id: "ru",
    name: "Russian",
    regions: [
      { id: "ru-RU", label: "Russia", city: "Moscow", accent: "Moscow Russian" },
      { id: "ru-SP", label: "Saint Petersburg", city: "Saint Petersburg", accent: "Petersburg Russian" },
    ],
  },
]

export const LANGUAGE_IDS = LANGUAGES.map((language) => language.id)

export const DEFAULT_LANGUAGE_ID: LanguageId = "en"
export const DEFAULT_REGION_ID: RegionId = "en-US"

export function getLanguage(id: LanguageId): Language {
  const language = LANGUAGES.find((l) => l.id === id)
  if (!language) throw new Error(`Unknown language: ${id}`)
  return language
}

export function getRegion(languageId: LanguageId, regionId: RegionId): Region {
  const language = getLanguage(languageId)
  return language.regions.find((r) => r.id === regionId) ?? language.regions[0]
}

export function getDefaultRegionId(languageId: LanguageId): RegionId {
  return getLanguage(languageId).regions[0].id
}

export function isLanguageId(value: string): value is LanguageId {
  return LANGUAGES.some((l) => l.id === value)
}

export function isRegionId(value: string): value is RegionId {
  return LANGUAGES.some((l) => l.regions.some((r) => r.id === value))
}
