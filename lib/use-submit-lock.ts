"use client";

import { useCallback, useRef } from "react";

/**
 * Guards a submit handler against double-clicks. Disabling the button via
 * state isn't enough on its own: a fast second click can land before React
 * re-renders. A ref flips synchronously, so the second call is dropped.
 */
export function useSubmitLock() {
  const locked = useRef(false);
  return useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (locked.current) return undefined;
    locked.current = true;
    try {
      return await fn();
    } finally {
      locked.current = false;
    }
  }, []);
}
