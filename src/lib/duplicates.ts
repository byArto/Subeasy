import type { Subscription } from './types';

const LS_KEY = 'neonsub-ignored-dups';

// ─── Core Algorithm ──────────────────────────────────────────────────────────

export function findDuplicates(subs: Subscription[]): Subscription[][] {
  const groups = new Map<string, Subscription[]>();
  for (const sub of subs) {
    const key = sub.name.toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(sub);
  }
  return Array.from(groups.values()).filter((g) => g.length >= 2);
}

// ─── Ignored Pairs (localStorage) ────────────────────────────────────────────

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

export function getIgnoredPairs(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function ignorePair(id1: string, id2: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getIgnoredPairs();
    existing.add(pairKey(id1, id2));
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(existing)));
  } catch {
    // ignore
  }
}

export function isGroupIgnored(
  group: Subscription[],
  ignored: Set<string>,
): boolean {
  if (group.length < 2) return false;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (!ignored.has(pairKey(group[i].id, group[j].id))) return false;
    }
  }
  return true;
}
