import { create } from 'zustand';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';

interface EditorState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  workflowId: string | null;
  workflowName: string;
  isDirty: boolean;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  selectNode: (id: string | null) => void;
  setWorkflow: (id: string, name: string, nodes: Node[], edges: Edge[]) => void;
  setWorkflowName: (name: string) => void;
  markClean: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isDirty: false,

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        { ...connection, type: 'smoothstep', animated: true },
        get().edges
      ),
      isDirty: true,
    });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node], isDirty: true });
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter(n => n.id !== id),
      edges: get().edges.filter(e => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
      isDirty: true,
    });
  },

  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  setWorkflow: (id, name, nodes, edges) =>
    set({ workflowId: id, workflowName: name, nodes, edges, isDirty: false, selectedNodeId: null }),

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

  markClean: () => set({ isDirty: false }),
}));
