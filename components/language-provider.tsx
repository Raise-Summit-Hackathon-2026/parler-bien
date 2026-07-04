"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  DEFAULT_LANGUAGE_ID,
  DEFAULT_REGION_ID,
  getDefaultRegionId,
  isLanguageId,
  isRegionId,
  type LanguageId,
  type RegionId,
} from "@/lib/languages"

const STORAGE_KEY = "parler-bien:language"

type LanguageState = {
  languageId: LanguageId
  regionId: RegionId
}

type LanguageContextValue = LanguageState & {
  setLanguageId: (languageId: LanguageId) => void
  setRegionId: (regionId: RegionId) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLanguage(): LanguageState {
  if (typeof window === "undefined") {
    return { languageId: DEFAULT_LANGUAGE_ID, regionId: DEFAULT_REGION_ID }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { languageId: DEFAULT_LANGUAGE_ID, regionId: DEFAULT_REGION_ID }
    }

    const parsed = JSON.parse(raw) as Partial<LanguageState>
    const languageId =
      parsed.languageId && isLanguageId(parsed.languageId)
        ? parsed.languageId
        : DEFAULT_LANGUAGE_ID
    const regionId =
      parsed.regionId && isRegionId(parsed.regionId)
        ? parsed.regionId
        : getDefaultRegionId(languageId)

    return { languageId, regionId }
  } catch {
    return { languageId: DEFAULT_LANGUAGE_ID, regionId: DEFAULT_REGION_ID }
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LanguageState>(() => readStoredLanguage())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage unavailable
    }
  }, [state])

  const setLanguageId = useCallback((languageId: LanguageId) => {
    setState({
      languageId,
      regionId: getDefaultRegionId(languageId),
    })
  }, [])

  const setRegionId = useCallback((regionId: RegionId) => {
    setState((current) => ({ ...current, regionId }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      setLanguageId,
      setRegionId,
    }),
    [state, setLanguageId, setRegionId],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
