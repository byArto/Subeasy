type SyncableSubscription = {
  id: string;
  workspaceId?: string;
};

export function mergePersonalSubscriptionsForSync<T extends SyncableSubscription>({
  remoteSubs,
  localSubs,
  knownSyncedIds,
  importLocalOnly,
}: {
  remoteSubs: T[];
  localSubs: T[];
  knownSyncedIds: Iterable<string>;
  importLocalOnly: boolean;
}): T[] {
  const remoteMap = new Map(remoteSubs.map((sub) => [sub.id, sub]));
  const knownIds = new Set(knownSyncedIds);
  const merged = [...remoteSubs];

  for (const local of localSubs.filter((sub) => !sub.workspaceId)) {
    if (remoteMap.has(local.id)) continue;
    if (knownIds.has(local.id)) continue;
    if (importLocalOnly) merged.push(local);
  }

  return merged;
}
