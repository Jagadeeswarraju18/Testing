import { Workspace } from './types';

// Mock State
let workspaces: Workspace[] = [
    { id: 'ws-1', name: 'Test Space', type: 'personal', ownerId: 'u-1', currency: 'USD' }
];
let activeWorkspace: Workspace | null = workspaces[0];

const updateWorkspace = (id: string, updates: Partial<Workspace>) => {
    console.log("Updating workspace:", id, updates);
    const updatedWorkspaces = workspaces.map(ws =>
        ws.id === id ? { ...ws, ...updates } : ws
    );
    workspaces = updatedWorkspaces;

    if (activeWorkspace && activeWorkspace.id === id) {
        console.log("Updating active workspace state");
        activeWorkspace = { ...activeWorkspace, ...updates };
    } else {
        console.log("Active workspace ID mismatch:", activeWorkspace?.id, id);
    }
};

// Simulation
console.log("Initial Active:", activeWorkspace);
updateWorkspace('ws-1', { currency: 'INR' });
console.log("Updated Active:", activeWorkspace);

if (activeWorkspace?.currency !== 'INR') {
    console.error("FAIL: Currency did not update!");
    process.exit(1);
} else {
    console.log("SUCCESS: Currency updated.");
}
