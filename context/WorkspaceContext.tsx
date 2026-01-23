import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace, WorkspaceType, User } from '../types';
import { supabase } from '../lib/supabase';

interface WorkspaceContextType {
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    setActiveWorkspace: (workspace: Workspace) => void;
    createWorkspace: (name: string, type: WorkspaceType, user: User) => Promise<Workspace | null>;
    updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
    deleteWorkspace: (id: string) => Promise<void>;
    isBusinessWorkspace: boolean;
    loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    // Load initial workspace from local storage
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
        return localStorage.getItem('subtrack_active_workspace');
    });
    const [loading, setLoading] = useState(true);

    // Persist active workspace changes
    useEffect(() => {
        if (activeWorkspaceId) {
            localStorage.setItem('subtrack_active_workspace', activeWorkspaceId);
        }
    }, [activeWorkspaceId]);

    // Fetch workspaces from Supabase
    const fetchWorkspaces = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setWorkspaces([]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('ownerId', user.id)
            .order('createdAt', { ascending: true });

        if (error) {
            console.error('Error fetching workspaces:', error);
        } else {
            setWorkspaces(data || []);

            // Logic to set active workspace if null or invalid
            const storedId = localStorage.getItem('subtrack_active_workspace');
            const isValidStored = storedId && data?.find(w => w.id === storedId);

            if (isValidStored) {
                setActiveWorkspaceId(storedId);
            } else if (data && data.length > 0) {
                // Default to first if no valid stored ID
                setActiveWorkspaceId(data[0].id);
            }
        }
        setLoading(false);
    };

    // Listen for Auth Changes to refetch
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchWorkspaces();
            } else if (event === 'SIGNED_OUT') {
                setWorkspaces([]);
                setActiveWorkspaceId(null);
                localStorage.removeItem('subtrack_active_workspace');
            }
        });

        fetchWorkspaces();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const activeWorkspace = React.useMemo(() =>
        workspaces.find(w => w.id === activeWorkspaceId) || null
        , [workspaces, activeWorkspaceId]);

    const createWorkspace = async (name: string, type: WorkspaceType, user: User) => {
        const { data, error } = await supabase
            .from('workspaces')
            .insert([{
                name,
                type,
                ownerId: user.id,
                currency: 'USD',
                isDefault: type === 'personal' && workspaces.length === 0,
                createdAt: new Date().toISOString() // Ensure matches DB if needed, but DB defaults usually handle this. 
                // However, we used camelCase in SQL, so we must quote if we used raw SQL, but supabase js client handles mapping if configured?
                // Wait, our SQL used quoted identifiers: "ownerId". Supabase JS client requires exact column matching.
                // If we defined columns as "ownerId", we must send ownerId.
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating workspace:', error);
            alert(error.message);
            return null;
        }

        const newWorkspace = data as Workspace;
        setWorkspaces(prev => [...prev, newWorkspace]);
        setActiveWorkspaceId(newWorkspace.id);
        return newWorkspace;
    };

    const updateWorkspace = async (id: string, updates: Partial<Workspace>) => {
        // Optimistic update
        setWorkspaces(prev => prev.map(ws => ws.id === id ? { ...ws, ...updates } : ws));

        const { error } = await supabase
            .from('workspaces')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating workspace:', error);
            // Revert logic would go here ideally
        }
    };

    const setActiveWorkspace = (workspace: Workspace) => {
        setActiveWorkspaceId(workspace.id);
    };

    const deleteWorkspace = async (id: string) => {
        const workspace = workspaces.find(w => w.id === id);
        if (workspace?.type === 'personal') {
            throw new Error("Cannot delete Personal workspace.");
        }

        // Store original state for rollback
        const originalWorkspaces = [...workspaces];
        const originalActiveId = activeWorkspaceId;

        // Optimistic update
        const updated = workspaces.filter(w => w.id !== id);
        setWorkspaces(updated);

        // Switch to another workspace if deleting the active one
        if (activeWorkspaceId === id) {
            const personal = updated.find(w => w.type === 'personal');
            const newActiveId = personal?.id || updated[0]?.id || null;
            setActiveWorkspaceId(newActiveId);

            // Update localStorage
            if (newActiveId) {
                localStorage.setItem('subtrack_active_workspace', newActiveId);
            } else {
                localStorage.removeItem('subtrack_active_workspace');
            }
        }

        // First, HARD delete all subscriptions in this workspace (required for FK constraint)
        const { error: subsError } = await supabase
            .from('subscriptions')
            .delete()
            .eq('workspaceId', id);

        if (subsError) {
            console.error('Error deleting workspace subscriptions:', subsError);
            // Revert on error
            setWorkspaces(originalWorkspaces);
            setActiveWorkspaceId(originalActiveId);
            if (originalActiveId) {
                localStorage.setItem('subtrack_active_workspace', originalActiveId);
            }
            throw new Error(`Failed to delete subscriptions: ${subsError.message}`);
        }

        // Then delete the workspace
        const { error } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting workspace:', error);
            // Revert optimistic update on error
            setWorkspaces(originalWorkspaces);
            setActiveWorkspaceId(originalActiveId);
            if (originalActiveId) {
                localStorage.setItem('subtrack_active_workspace', originalActiveId);
            }
            throw new Error(`Failed to delete workspace: ${error.message}`);
        }

        // Clear localStorage entry for deleted workspace if it was stored
        const storedId = localStorage.getItem('subtrack_active_workspace');
        if (storedId === id) {
            const personal = updated.find(w => w.type === 'personal');
            if (personal) {
                localStorage.setItem('subtrack_active_workspace', personal.id);
            } else if (updated.length > 0) {
                localStorage.setItem('subtrack_active_workspace', updated[0].id);
            } else {
                localStorage.removeItem('subtrack_active_workspace');
            }
        }
    };

    return (
        <WorkspaceContext.Provider value={{
            workspaces,
            activeWorkspace,
            setActiveWorkspace,
            createWorkspace,
            updateWorkspace,
            deleteWorkspace,
            isBusinessWorkspace: activeWorkspace?.type?.toLowerCase() === 'business',
            loading
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
};
