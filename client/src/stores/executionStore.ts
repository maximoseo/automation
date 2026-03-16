import { create } from 'zustand';

export interface NodeExecutionState {
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error';
  output?: unknown;
  error?: string;
  executionTimeMs?: number;
}

interface ExecutionState {
  currentExecutionId: string | null;
  executionStatus: 'idle' | 'running' | 'success' | 'error';
  nodeStates: Map<string, NodeExecutionState>;
  isExecutionPanelOpen: boolean;

  startExecution: (executionId: string) => void;
  setNodeState: (nodeName: string, state: NodeExecutionState) => void;
  completeExecution: (status: 'success' | 'error', error?: string) => void;
  reset: () => void;
  toggleExecutionPanel: () => void;
  setExecutionPanelOpen: (open: boolean) => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  currentExecutionId: null,
  executionStatus: 'idle',
  nodeStates: new Map(),
  isExecutionPanelOpen: false,

  startExecution: (executionId) => set({
    currentExecutionId: executionId,
    executionStatus: 'running',
    nodeStates: new Map(),
    isExecutionPanelOpen: true,
  }),

  setNodeState: (nodeName, state) => {
    const newMap = new Map(get().nodeStates);
    newMap.set(nodeName, state);
    set({ nodeStates: newMap });
  },

  completeExecution: (status, error) => set({ executionStatus: status }),

  reset: () => set({
    currentExecutionId: null,
    executionStatus: 'idle',
    nodeStates: new Map(),
  }),

  toggleExecutionPanel: () => set({ isExecutionPanelOpen: !get().isExecutionPanelOpen }),
  setExecutionPanelOpen: (open) => set({ isExecutionPanelOpen: open }),
}));
