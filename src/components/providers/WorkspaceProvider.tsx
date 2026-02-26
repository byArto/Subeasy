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
import { pullWorkspace, pullWorkspaceSubscriptions } from '@/lib/sync';
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
  /** Re-fetch workspace subscriptions from Supabase */
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

  const refreshWorkspaceSubs = useCallback(async () => {
    if (!workspace) return;
    const subs = await pullWorkspaceSubscriptions(workspace.id);
    setWorkspaceSubs(subs);
  }, [workspace]);

  /**
   * Activate workspace mode: store data, save to localStorage, load subscriptions.
   */
  const activateWorkspace = useCallback(async (ws: Workspace, mems: WorkspaceMember[]) => {
    setWorkspace(ws);
    setMembers(mems);
    setIsWorkspaceActive(true);
    try {
      localStorage.setItem(LS_KEY, ws.id);
    } catch { /* ignore */ }
    const subs = await pullWorkspaceSubscriptions(ws.id);
    setWorkspaceSubs(subs);
  }, []);

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
   * Reload workspace from Supabase (after create or join).
   * Always enters workspace mode after successful load.
   */
  const reloadWorkspace = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await pullWorkspace(user.id);
      if (result) {
        await activateWorkspace(result.workspace, result.members);
      }
    } catch (err) {
      console.warn('[WorkspaceProvider] reloadWorkspace error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activateWorkspace]);

  // On login: auto-load workspace if user belongs to one
  useEffect(() => {
    if (!user || loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    async function autoLoad() {
      setLoading(true);
      try {
        const result = await pullWorkspace(user!.id);
        if (result) {
          // Check if user was previously in workspace mode
          let wasActive = false;
          try {
            wasActive = localStorage.getItem(LS_KEY) === result.workspace.id;
          } catch { /* ignore */ }

          if (wasActive) {
            // Restore workspace mode
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
