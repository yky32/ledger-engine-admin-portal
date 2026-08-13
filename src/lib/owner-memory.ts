const OWNER_KEY = "ledgerx.records.ownerIds";

export function loadRememberedOwnerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OWNER_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function rememberOwnerId(ownerId: string) {
  if (typeof window === "undefined" || !ownerId.trim()) return;
  try {
    const cur = loadRememberedOwnerIds();
    const next = [ownerId.trim(), ...cur.filter((x) => x !== ownerId.trim())].slice(0, 40);
    localStorage.setItem(OWNER_KEY, JSON.stringify(next));
  } catch {
    /* */
  }
}

export function clearRememberedOwnerIds() {
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* */
  }
}
