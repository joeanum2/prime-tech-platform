/**
 * Safe JSON parse helper (returns null on failure).
 * Use for optional parsing of headers/inputs without throwing.
 */
export function tryJsonParse<T = unknown>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
