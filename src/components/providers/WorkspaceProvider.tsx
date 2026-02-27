'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Workspace, WorkspaceMember, Subscription } from '@/lib/types';

interface WorkspaceContextValue {
  /** Workspace the user belongs to (null = user has no workspace at all) */
  workspace: Workspace | null;
  members: WorkspaceMember[];
  /** Subscriptions that belong to the active workspace */
  workspaceSubscriptions: Subscription[];
  isOwner: boolean;
  /**
   * true  = workspace mode: showing shared subscription pool
   * false = personal mode: showing own subscriptions (workspace still exists)
   */
  isWorkspaceActive: boolean;
  loading: boolean;
  /** Activate workspace mode and load its subscriptions */
  activateWorkspace: (ws: Workspace, members: WorkspaceMember[]) => Promise<void>;
  /** Switch to personal mode. Keeps workspace data — doesn't clear it. */
  switchToPersonal: () => void;
  /** Re-fetch workspace subscriptions via API (service client, bypasses RLS) */
  refreshWorkspaceSubs: () => Promise<void>;
  /** Returns the full invite URL */
  getInviteUrl: () => string;
  /** Call after creating / joining to reload workspace data and enter workspace mode */
  reloadWorkspace: () => Promise<void>;
  /** Full clear: workspace data + personal mode + reset loaded flag (use on logout/leave/delete) */
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const LS_KEY = 'neonsub-active-workspace-id';
const POLL_INTERVAL_MS = 30_000; // refresh workspace subs every 30s when active

/** Fetch workspace subscriptions via service-client API (bypasses RLS for all members) */
async function fetchWorkspaceSubs(workspaceId: string): Promise<Subscription[]> {
  try {
    const res = await fetch(`/api/workspace/subscriptions?workspaceId=${workspaceId}`);
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = await res.json();
    return rows.map((row) => ({
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
      workspaceId: row.workspace_id,
    }));
  } catch {
    return [];
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceSubscriptions, setWorkspaceSubs] = useState<Subscription[]>([]);
  const [isWorkspaceActive, setIsWorkspaceActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadedForUser = useRef<string | null>(null);

  const isOwner = !!(workspace && user && workspace.ownerId === user.id);

  const getInviteUrl = useCallback(() => {
    if (!workspace) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}?join=${workspace.inviteToken}`;
  }, [workspace]);

  // Fetch full members list via service-client API (bypasses RLS)
  const refreshMembers = useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspace/members?workspaceId=${workspaceId}`);
      if (!res.ok) return;
      const rows: { workspace_id: string; user_id: string; role: string; joined_at: string }[] = await res.json();
      setMembers(rows.map((m) => ({
        workspaceId: m.workspace_id,
        userId: m.user_id,
        role: m.role as 'owner' | 'member',
        joinedAt: m.joined_at,
      })));
    } catch { /* ignore */ }
  }, []);

  /** Re-fetch workspace subs via service-client API (all members can call this) */
  const refreshWorkspaceSubs = useCallback(async () => {
    if (!workspace) return;
    const subs = await fetchWorkspaceSubs(workspace.id);
    setWorkspaceSubs(subs);
  }, [workspace]);

  /**
   * Activate workspace mode: save to localStorage, load subs + members via service-client API.
   */
  const activateWorkspace = useCallback(async (ws: Workspace, mems: WorkspaceMember[]) => {
    setWorkspace(ws);
    setMembers(mems);
    setIsWorkspaceActive(true);
    try {
      localStorage.setItem(LS_KEY, ws.id);
    } catch { /* ignore */ }
    // Load subs and full members list in parallel (service client — no RLS issues)
    const [subs] = await Promise.all([
      fetchWorkspaceSubs(ws.id),
      refreshMembers(ws.id),
    ]);
    setWorkspaceSubs(subs);
  }, [refreshMembers]);

  /**
   * Switch to personal mode. Keeps workspace + members data so Settings still
   * shows the owner/member view. Clears workspace subscriptions from memory.
   */
  const switchToPersonal = useCallback(() => {
    setIsWorkspaceActive(false);
    setWorkspaceSubs([]);
    try {
      localStorage.removeItem(LS_KEY);
    } catch { /* ignore */ }
  }, []);

  /**
   * Full reset: clears everything. Use on logout, leave workspace, delete workspace.
   */
  const clearWorkspace = useCallback(() => {
    setWorkspace(null);
    setMembers([]);
    setWorkspaceSubs([]);
    setIsWorkspaceActive(false);
    loadedForUser.current = null;
    try {
      localStorage.removeItem(LS_KEY);
    } catch { /* ignore */ }
  }, []);

  /**
   * Fetch workspace via API (service client, bypasses RLS entirely).
   * Used as the primary load method — no dependency on browser RLS policies.
   */
  const fetchWorkspaceViaApi = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/workspace/mine?userId=${userId}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.workspace) return null;
      return data as { workspace: Workspace; members: WorkspaceMember[] };
    } catch {
      return null;
    }
  }, []);

  /**
   * Reload workspace from server (after create or join).
   * Always enters workspace mode after successful load.
   */
  const reloadWorkspace = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await fetchWorkspaceViaApi(user.id);
      if (result) {
        await activateWorkspace(result.workspace, result.members);
      }
    } catch (err) {
      console.warn('[WorkspaceProvider] reloadWorkspace error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activateWorkspace, fetchWorkspaceViaApi]);

  // On login: auto-load workspace if user belongs to one
  useEffect(() => {
    if (!user || loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    async function autoLoad() {
      setLoading(true);
      try {
        // Use API endpoint (service client) — immune to RLS issues
        const result = await fetchWorkspaceViaApi(user!.id);
        if (result) {
          // Check if user was previously in workspace mode
          let wasActive = false;
          try {
            wasActive = localStorage.getItem(LS_KEY) === result.workspace.id;
          } catch { /* ignore */ }

          if (wasActive) {
            // Restore workspace mode (loads subs via service-client API)
            await activateWorkspace(result.workspace, result.members);
          } else {
            // Store workspace data but stay in personal mode
            setWorkspace(result.workspace);
            setMembers(result.members);
            setIsWorkspaceActive(false);
          }
        }
      } catch (err) {
        console.warn('[WorkspaceProvider] autoLoad error:', err);
      } finally {
        setLoading(false);
      }
    }

    autoLoad();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll workspace subscriptions every 30s when workspace mode is active
  useEffect(() => {
    if (!isWorkspaceActive || !workspace) return;
    const timer = setInterval(async () => {
      const subs = await fetchWorkspaceSubs(workspace.id);
      setWorkspaceSubs(subs);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isWorkspaceActive, workspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear everything on logout
  useEffect(() => {
    if (!user) {
      clearWorkspace();
    }
  }, [user, clearWorkspace]);

  const value: WorkspaceContextValue = {
    workspace,
    members,
    workspaceSubscriptions,
    isOwner,
    isWorkspaceActive,
    loading,
    activateWorkspace,
    switchToPersonal,
    refreshWorkspaceSubs,
    getInviteUrl,
    reloadWorkspace,
    clearWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
