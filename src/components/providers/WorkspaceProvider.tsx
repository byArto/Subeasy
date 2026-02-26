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
  /** Currently active workspace (null = personal mode) */
  workspace: Workspace | null;
  members: WorkspaceMember[];
  /** Subscriptions that belong to the active workspace */
  workspaceSubscriptions: Subscription[];
  isOwner: boolean;
  loading: boolean;
  /** Switch to workspace mode and load its subscriptions */
  activateWorkspace: (ws: Workspace, members: WorkspaceMember[]) => Promise<void>;
  /** Go back to personal mode */
  switchToPersonal: () => void;
  /** Re-fetch workspace subscriptions from Supabase */
  refreshWorkspaceSubs: () => Promise<void>;
  /** Returns the full invite URL */
  getInviteUrl: () => string;
  /** Call after creating / joining to reload workspace data */
  reloadWorkspace: () => Promise<void>;
  /** Clear workspace context (on logout / leave) */
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const LS_KEY = 'neonsub-active-workspace-id';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceSubscriptions, setWorkspaceSubs] = useState<Subscription[]>([]);
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

  const activateWorkspace = useCallback(async (ws: Workspace, mems: WorkspaceMember[]) => {
    setWorkspace(ws);
    setMembers(mems);
    try {
      localStorage.setItem(LS_KEY, ws.id);
    } catch { /* ignore */ }
    const subs = await pullWorkspaceSubscriptions(ws.id);
    setWorkspaceSubs(subs);
  }, []);

  const switchToPersonal = useCallback(() => {
    setWorkspace(null);
    setMembers([]);
    setWorkspaceSubs([]);
    try {
      localStorage.removeItem(LS_KEY);
    } catch { /* ignore */ }
  }, []);

  const clearWorkspace = useCallback(() => {
    switchToPersonal();
    loadedForUser.current = null;
  }, [switchToPersonal]);

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
            await activateWorkspace(result.workspace, result.members);
          } else {
            // Just store workspace data but stay in personal mode
            setWorkspace(result.workspace);
            setMembers(result.members);
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

  // Clear on logout
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
