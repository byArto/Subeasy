import { createClient } from '@/lib/supabase';
import type { Subscription, Category, AppSettings, Workspace, WorkspaceMember } from '@/lib/types';

const supabase = () => createClient();

/* ═══════════════════════════════════════
   Subscriptions
   ═══════════════════════════════════════ */

export async function pullSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await supabase()
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.warn('[sync] pullSubscriptions error:', error.message);
    return [];
  }

  return (data ?? []).map(dbToSubscription);
}

export async function pushSubscriptions(userId: string, subs: Subscription[]): Promise<void> {
  // Delete all user's subscriptions and re-insert (simple full sync)
  const client = supabase();
  await client.from('subscriptions').delete().eq('user_id', userId);

  if (subs.length === 0) return;

  const rows = subs.map((s) => subscriptionToDb(s, userId));
  const { error } = await client.from('subscriptions').insert(rows);

  if (error) console.warn('[sync] pushSubscriptions error:', error.message);
}

export async function syncSubscriptions(
  userId: string,
  localSubs: Subscription[]
): Promise<Subscription[]> {
  const remoteSubs = await pullSubscriptions(userId);

  // Merge: remote wins for same id, add local-only items
  const remoteMap = new Map(remoteSubs.map((s) => [s.id, s]));
  const merged = [...remoteSubs];

  for (const local of localSubs) {
    if (!remoteMap.has(local.id)) {
      merged.push(local);
    }
  }

  // Push merged result
  await pushSubscriptions(userId, merged);
  return merged;
}

/* ═══════════════════════════════════════
   Categories
   ═══════════════════════════════════════ */

export async function pullCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase()
    .from('categories')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.warn('[sync] pullCategories error:', error.message);
    return [];
  }

  return (data ?? []).map(dbToCategory);
}

export async function pushCategories(userId: string, cats: Category[]): Promise<void> {
  const client = supabase();
  await client.from('categories').delete().eq('user_id', userId);

  if (cats.length === 0) return;

  const rows = cats.map((c) => categoryToDb(c, userId));
  const { error } = await client.from('categories').insert(rows);

  if (error) console.warn('[sync] pushCategories error:', error.message);
}

export async function syncCategories(
  userId: string,
  localCats: Category[]
): Promise<Category[]> {
  const remoteCats = await pullCategories(userId);

  const remoteMap = new Map(remoteCats.map((c) => [c.id, c]));
  const merged = [...remoteCats];

  for (const local of localCats) {
    if (!remoteMap.has(local.id)) {
      merged.push(local);
    }
  }

  await pushCategories(userId, merged);
  return merged;
}

/* ═══════════════════════════════════════
   Settings
   ═══════════════════════════════════════ */

export async function pullSettings(userId: string): Promise<AppSettings | null> {
  const { data, error } = await supabase()
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    displayCurrency: data.display_currency,
    exchangeRate: Number(data.exchange_rate),
    eurExchangeRate: data.eur_exchange_rate ? Number(data.eur_exchange_rate) : 105,
    useManualRate: data.use_manual_rate,
    notificationsEnabled: data.notifications_enabled,
    notifyDaysBefore: data.notify_days_before,
  };
}

export async function pushSettings(userId: string, settings: AppSettings): Promise<void> {
  const { error } = await supabase()
    .from('user_settings')
    .upsert({
      user_id: userId,
      display_currency: settings.displayCurrency,
      exchange_rate: settings.exchangeRate,
      eur_exchange_rate: settings.eurExchangeRate ?? 105,
      use_manual_rate: settings.useManualRate,
      notifications_enabled: settings.notificationsEnabled,
      notify_days_before: settings.notifyDaysBefore,
    });

  if (error) console.warn('[sync] pushSettings error:', error.message);
}

export async function syncSettings(
  userId: string,
  localSettings: AppSettings
): Promise<AppSettings> {
  const remote = await pullSettings(userId);
  // Remote wins for synced fields, but preserve local-only fields
  // (monthlyBudget is not stored in Supabase yet)
  if (remote) {
    return { ...remote, monthlyBudget: localSettings.monthlyBudget };
  }
  await pushSettings(userId, localSettings);
  return localSettings;
}

/* ═══════════════════════════════════════
   DB ↔ App type converters
   ═══════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToSubscription(row: any): Subscription {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    currency: row.currency,
    category: row.category,
    cycle: row.cycle,
    nextPaymentDate: row.next_payment_date,
    startDate: row.start_date,
    paymentMethod: row.payment_method ?? '',
    notes: row.notes ?? '',
    color: row.color ?? '#00FF41',
    icon: row.icon ?? '📦',
    managementUrl: row.management_url ?? '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
  };
}

function subscriptionToDb(s: Subscription, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    price: s.price,
    currency: s.currency,
    category: s.category,
    cycle: s.cycle,
    next_payment_date: s.nextPaymentDate,
    start_date: s.startDate,
    payment_method: s.paymentMethod,
    notes: s.notes,
    color: s.color,
    icon: s.icon,
    management_url: s.managementUrl,
    is_active: s.isActive,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
  };
}

function categoryToDb(c: Category, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    emoji: c.emoji,
    color: c.color,
  };
}

/* ═══════════════════════════════════════
   Workspace
   ═══════════════════════════════════════ */

/** Pull workspace where user is owner or member */
export async function pullWorkspace(userId: string): Promise<{
  workspace: Workspace;
  members: WorkspaceMember[];
} | null> {
  const client = supabase();

  // Find workspace_members record for this user
  const { data: memberRows, error: mErr } = await client
    .from('workspace_members')
    .select('workspace_id, role, joined_at')
    .eq('user_id', userId)
    .limit(1);

  if (mErr || !memberRows || memberRows.length === 0) return null;

  const workspaceId = memberRows[0].workspace_id;

  // Fetch workspace details
  const { data: ws, error: wsErr } = await client
    .from('workspaces')
    .select('id, name, owner_id, invite_token, created_at')
    .eq('id', workspaceId)
    .single();

  if (wsErr || !ws) return null;

  // Fetch all members of this workspace
  const { data: allMembers } = await client
    .from('workspace_members')
    .select('workspace_id, user_id, role, joined_at')
    .eq('workspace_id', workspaceId);

  const members: WorkspaceMember[] = (allMembers ?? []).map((m) => ({
    workspaceId: m.workspace_id,
    userId: m.user_id,
    role: m.role as 'owner' | 'member',
    joinedAt: m.joined_at,
  }));

  return {
    workspace: {
      id: ws.id,
      name: ws.name,
      ownerId: ws.owner_id,
      inviteToken: ws.invite_token,
      createdAt: ws.created_at,
    },
    members,
  };
}

/** Pull subscriptions that belong to a workspace */
export async function pullWorkspaceSubscriptions(workspaceId: string): Promise<Subscription[]> {
  const { data, error } = await supabase()
    .from('subscriptions')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.warn('[sync] pullWorkspaceSubscriptions error:', error.message);
    return [];
  }

  return (data ?? []).map(dbToSubscription);
}

/**
 * Upsert a single subscription into a workspace.
 * We use upsert (not delete-all) to avoid overwriting other members' data.
 */
export async function upsertWorkspaceSubscription(
  sub: Subscription,
  workspaceId: string,
  userId: string
): Promise<void> {
  const row = {
    ...subscriptionToDb(sub, userId),
    workspace_id: workspaceId,
  };

  const { error } = await supabase()
    .from('subscriptions')
    .upsert(row, { onConflict: 'id' });

  if (error) console.warn('[sync] upsertWorkspaceSubscription error:', error.message);
}

/** Delete a single workspace subscription by id */
export async function deleteWorkspaceSubscription(subId: string): Promise<void> {
  const { error } = await supabase()
    .from('subscriptions')
    .delete()
    .eq('id', subId);

  if (error) console.warn('[sync] deleteWorkspaceSubscription error:', error.message);
}
