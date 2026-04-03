import { useState, useCallback } from 'react'

/**
 * useActionState — lightweight undo/cancel state manager.
 * Maintains a history stack so any action can be stepped back
 * without requiring a full page reload or context reset.
 */
export function useActionState<T>(initialState: T) {
  const [history,      setHistory]      = useState<T[]>([initialState])
  const [currentIndex, setCurrentIndex] = useState(0)

  /** Push a new state onto the history stack. */
  const setAction = useCallback(
    (newState: T) => {
      setHistory((prev) => [...prev.slice(0, currentIndex + 1), newState])
      setCurrentIndex((prev) => prev + 1)
    },
    [currentIndex]
  )

  /** Step back one state. */
  const undo = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1)
  }, [currentIndex])

  /** Reset to the original initial state. */
  const cancel = useCallback(() => {
    setHistory([initialState])
    setCurrentIndex(0)
  }, [initialState])

  return {
    state:    history[currentIndex],
    setAction,
    undo,
    cancel,
    canUndo:  currentIndex > 0,
    canReset: currentIndex > 0,
  }
}
