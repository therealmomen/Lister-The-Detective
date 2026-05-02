const STORAGE_KEY = "lister_history_ids";
const MAX_ITEMS = 50;

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

function writeIds(ids: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage full or private browsing — silently ignore
  }
}

export function addToLocalHistory(id: number): void {
  const ids = readIds().filter((v) => v !== id);
  writeIds([id, ...ids].slice(0, MAX_ITEMS));
}

export function removeFromLocalHistory(id: number): void {
  writeIds(readIds().filter((v) => v !== id));
}

export function clearLocalHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getLocalHistoryIds(): number[] {
  return readIds();
}
