import { useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflow, useSaveWorkflow, useExecuteWorkflow } from '@/hooks/useWorkflows';
import { useEditorStore } from '@/stores/editorStore';
import { useExecutionStore } from '@/stores/executionStore';
import { useSSE } from '@/hooks/useSSE';
import { WorkflowNode } from '@/components/nodes/WorkflowNode';
import { NodePalette } from '@/components/editor/NodePalette';
import { InspectorPanel } from '@/components/editor/InspectorPanel';
import { ExecutionPanel } from '@/components/editor/ExecutionPanel';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { n8nToReactFlow, reactFlowToN8n } from '@/lib/n8n/converter';
import { NODE_TYPE_CONFIGS } from '@shared/node';
// Simple ID generator for new nodes
function generateId() {
  return 'node_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

const nodeTypes = { workflowNode: WorkflowNode };

function WorkflowEditorInner() {
  const { id } = useParams<{ id: string }>();
  const { data: workflow, isLoading } = useWorkflow(id);
  const saveMutation = useSaveWorkflow();
  const executeMutation = useExecuteWorkflow();
  const reactFlowInstance = useReactFlow();

  const {
    nodes, edges, setWorkflow, workflowName, setWorkflowName,
    onNodesChange, onEdgesChange, onConnect, addNode, selectNode, markClean,
  } = useEditorStore();

  const { currentExecutionId, startExecution } = useExecutionStore();
  useSSE(currentExecutionId);

  const initialized = useRef(false);

  // Load workflow
  useEffect(() => {
    if (workflow && !initialized.current) {
      initialized.current = true;
      const wfJson = workflow.workflow_json;
      const { nodes: rfNodes, edges: rfEdges } = n8nToReactFlow(wfJson);
      setWorkflow(workflow.id, workflow.name, rfNodes, rfEdges);
    }
  }, [workflow, setWorkflow]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      initialized.current = false;
    };
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!id) return;
    const wfJson = reactFlowToN8n(nodes, edges, workflowName);
    await saveMutation.mutateAsync({
      id,
      name: workflowName,
      workflow_json: wfJson,
    });
    markClean();
  }, [id, nodes, edges, workflowName, saveMutation, markClean]);

  const handleRun = useCallback(async () => {
    if (!id) return;
    // Save first
    const wfJson = reactFlowToN8n(nodes, edges, workflowName);
    await saveMutation.mutateAsync({ id, name: workflowName, workflow_json: wfJson });
    markClean();
    // Execute
    const result = await executeMutation.mutateAsync(id);
    startExecution(result.data.execution_id);
  }, [id, nodes, edges, workflowName, saveMutation, executeMutation, startExecution, markClean]);

  const handleAddNode = useCallback((type: string) => {
    const config = NODE_TYPE_CONFIGS[type];
    if (!config) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const newNode = {
      id: generateId(),
      type: 'workflowNode',
      position,
      data: {
        label: config.displayName,
        nodeType: type,
        parameters: { ...config.defaultParameters },
        supportLevel: config.supportLevel,
        icon: config.icon,
        color: config.color,
        displayName: config.displayName,
        category: config.category,
        outputs: config.outputs,
        inputs: config.inputs,
      },
    };
    addNode(newNode);
  }, [addNode, reactFlowInstance]);

  const handleImport = useCallback((json: any) => {
    const { nodes: rfNodes, edges: rfEdges } = n8nToReactFlow(json);
    setWorkflow(id!, json.name || workflowName, rfNodes, rfEdges);
  }, [id, workflowName, setWorkflow]);

  const handleExport = useCallback(() => {
    const wfJson = reactFlowToN8n(nodes, edges, workflowName);
    const blob = new Blob([JSON.stringify(wfJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/[^a-z0-9]/gi, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, workflowName]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const config = NODE_TYPE_CONFIGS[type];
    if (!config) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });

    addNode({
      id: generateId(),
      type: 'workflowNode',
      position,
      data: {
        label: config.displayName,
        nodeType: type,
        parameters: { ...config.defaultParameters },
        supportLevel: config.supportLevel,
        icon: config.icon,
        color: config.color,
        displayName: config.displayName,
        category: config.category,
        outputs: config.outputs,
        inputs: config.inputs,
      },
    });
  }, [addNode, reactFlowInstance]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading workflow...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <EditorToolbar
        onSave={handleSave}
        onRun={handleRun}
        onImport={handleImport}
        onExport={handleExport}
        saving={saveMutation.isPending}
      />

      <div className="flex-1 flex overflow-hidden">
        <NodePalette onAddNode={handleAddNode} />

        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={() => selectNode(null)}
              nodeTypes={nodeTypes}
              onDragOver={onDragOver}
              onDrop={onDrop}
              fitView
              defaultEdgeOptions={{
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#7c3aed', strokeWidth: 2 },
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Controls className="!bg-card !border !shadow-md" />
              <MiniMap
                className="!bg-card !border"
                nodeColor={(node) => (node.data?.color as string) || '#6b7280'}
                maskColor="rgba(0,0,0,0.3)"
              />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
            </ReactFlow>
          </div>

          <ExecutionPanel />
        </div>

        <InspectorPanel />
      </div>
    </div>
  );
}

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  );
}
