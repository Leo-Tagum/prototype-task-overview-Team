import { useCallback, useState } from "react";
import { newId } from "./id";
import type { Person } from "@/types";

const VIEWER_KEY = "taskTracker.viewerId.v1";
const DEVICE_KEY = "taskTracker.deviceId.v1";

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // best-effort — private window or full quota just means no persistence
  }
}

/** A stable per-browser id used only as the store's lease holder / actorId
 * before a viewer has picked (or been asked) who they are. Never shown. */
function deviceId(): string {
  let id = readLocal(DEVICE_KEY);
  if (!id) {
    id = `device-${newId()}`;
    writeLocal(DEVICE_KEY, id);
  }
  return id;
}

/**
 * Just the chosen-identity id, read synchronously from this browser's
 * personal storage — attribution, not authentication; never the shared
 * db. Kept free of any dependency on the store (roster/addPerson) so it
 * can be resolved before the store hook is constructed, which needs
 * `effectiveId` as an input.
 */
export function useViewerId() {
  const [viewerId, setViewerIdState] = useState<string | null>(() => readLocal(VIEWER_KEY));

  const setViewerId = useCallback((id: string) => {
    setViewerIdState(id);
    writeLocal(VIEWER_KEY, id);
  }, []);

  // Stable across renders once computed; only read from storage once.
  const [fallback] = useState(deviceId);
  const effectiveId = viewerId ?? fallback;

  return { viewerId, setViewerId, effectiveId };
}

/** Derives picker-relevant state once the store's roster has loaded. */
export function resolveViewer(viewerId: string | null, roster: Person[]) {
  const viewerPerson = roster.find((p) => p.id === viewerId) ?? null;
  const needsPicker = viewerId === null || (roster.length > 0 && !viewerPerson);
  return { viewerPerson, needsPicker };
}

/** Picks an existing roster entry by name (case-insensitive) or creates
 * one, then saves it as this browser's identity. */
export async function claimIdentity(
  name: string,
  roster: Person[],
  addPerson: (name: string) => Promise<Person>,
  setViewerId: (id: string) => void,
): Promise<Person> {
  const trimmed = name.trim();
  const existing = roster.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  const person = existing ?? (await addPerson(trimmed));
  setViewerId(person.id);
  return person;
}
