"use client"

import * as React from "react"

const STORAGE_KEY = "theme"
const THEME_QUERY = "(prefers-color-scheme: dark)"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light"
  }

  return window.matchMedia(THEME_QUERY).matches ? "dark" : "light"
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "system"
  }

  try {
    const theme = window.localStorage.getItem(STORAGE_KEY)

    if (theme === "light" || theme === "dark" || theme === "system") {
      return theme
    }
  } catch {}

  return "system"
}

function applyTheme(theme: Theme) {
  const resolvedTheme = resolveTheme(theme)
  const root = document.documentElement

  root.classList.toggle("dark", resolvedTheme === "dark")
  root.style.colorScheme = resolvedTheme
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readStoredTheme)

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    } catch {}
  }, [])

  React.useEffect(() => {
    applyTheme(theme)
  }, [theme])

  React.useEffect(() => {
    const media = window.matchMedia(THEME_QUERY)

    function onChange() {
      if (theme === "system") {
        applyTheme("system")
      }
    }

    media.addEventListener("change", onChange)

    return () => {
      media.removeEventListener("change", onChange)
    }
  }, [theme])

  React.useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) {
        return
      }

      setThemeState(readStoredTheme())
    }

    window.addEventListener("storage", onStorage)

    return () => {
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return (
    <>
      <ThemeHotkey theme={theme} setTheme={setTheme} />
      {children}
    </>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey({
  theme,
  setTheme,
}: {
  theme: Theme
  setTheme: (theme: Theme) => void
}) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (!event.key || event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolveTheme(theme) === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [theme, setTheme])

  return null
}

export { ThemeProvider }
