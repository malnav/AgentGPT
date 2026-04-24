import { useState, useEffect } from "react"

export function useCardToggle(cardId: string, defaultOpen = true) {
  const storageKey = `card-toggle:${cardId}`

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored !== null ? stored === "true" : defaultOpen
    } catch {
      return defaultOpen
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(isOpen))
    } catch {
      // ignore
    }
  }, [isOpen, storageKey])

  const toggle = () => setIsOpen((prev) => !prev)

  return { isOpen, toggle, setIsOpen }
}
