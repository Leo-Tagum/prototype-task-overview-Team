// Thin, defensive wrapper around the window.claude runtime bridge.
// Resolves null whenever a capability isn't served, isn't granted, or
// this is a plain preview with no bridge at all — callers always
// branch on null rather than assuming the capability exists.

declare global {
  interface Window {
    claude?: {
      use: (name: string) => Promise<unknown>;
    };
  }
}

export async function resolveCapability<T = unknown>(name: string): Promise<T | null> {
  try {
    if (typeof window === "undefined" || typeof window.claude?.use !== "function") {
      return null;
    }
    const ns = await window.claude.use(name);
    return (ns as T) ?? null;
  } catch {
    return null;
  }
}
