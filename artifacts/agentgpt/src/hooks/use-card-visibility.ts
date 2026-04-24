import { useState, useCallback } from "react";

const STORAGE_KEY = "card_visibility";

function loadVisibility(cards: string[]): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    return Object.fromEntries(cards.map((id) => [id, stored[id] ?? true]));
  } catch {
    return Object.fromEntries(cards.map((id) => [id, true]));
  }
}

function saveVisibility(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore write errors (private browsing, quota exceeded, etc.)
  }
}

export function useCardVisibility(cards: string[]) {
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    loadVisibility(cards)
  );

  const toggle = useCallback((id: string) => {
    setVisible((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveVisibility(next);
      return next;
    });
  }, []);

  return { visible, toggle };
}
