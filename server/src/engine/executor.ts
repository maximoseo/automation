import { N8nWorkflowJson } from '../../../shared/src/workflow';
import { buildDAG, topologicalSort, DAG } from './graph/dag';
import { NodeInput, NodeOutput, NodeExecutorContext } from './nodes/base';
import { executeCode } from './nodes/code';
import { executeHttpRequest } from './nodes/http-request';
import { executeIf, executeSwitch, executeMerge, executeSplitInBatches, executeNoOp } from './nodes/logic';
import { executeScheduleTrigger, executeWebhook, executeRespondToWebhook } from './nodes/triggers';
import { executeEmailSend, executeGoogleSheets, executeGoogleDrive, executeGoogleDriveTrigger, executeGoogleDocs, executeSlack, executeTwitter } from './nodes/integrations';
import { executionRepo } from '../db/repositories/execution-repository';
import { sseService } from '../services/sse';

type ExecutorFn = (context: NodeExecutorContext) => Promise<NodeOutput[]>;

const executors: Record<string, ExecutorFn> = {
  'n8n-nodes-base.code': executeCode,
  'n8n-nodes-base.httpRequest': executeHttpRequest,
  'n8n-nodes-base.if': executeIf,
  'n8n-nodes-base.switch': executeSwitch,
  'n8n-nodes-base.merge': executeMerge,
  'n8n-nodes-base.splitInBatches': executeSplitInBatches,
  'n8n-nodes-base.noOp': executeNoOp,
  'n8n-nodes-base.webhook': executeWebhook,
  'n8n-nodes-base.respondToWebhook': executeRespondToWebhook,
  'n8n-nodes-base.scheduleTrigger': executeScheduleTrigger,
  'n8n-nodes-base.emailSend': executeEmailSend,
  'n8n-nodes-base.googleSheets': executeGoogleSheets,
  'n8n-nodes-base.googleDrive': executeGoogleDrive,
  'n8n-nodes-base.googleDriveTrigger': executeGoogleDriveTrigger,
  'n8n-nodes-base.googleDocs': executeGoogleDocs,
  'n8n-nodes-base.slack': executeSlack,
  'n8n-nodes-base.twitter': executeTwitter,
};

export async function executeWorkflow(
  workflow: N8nWorkflowJson,
  executionId: string,
  triggerData?: Record<string, unknown>
): Promise<void> {
  const dag = buildDAG(workflow);
  const sortedNodes = topologicalSort(dag);
  const nodeOutputs = new Map<string, NodeOutput[]>();

  sseService.emit(executionId, 'execution:start', {
    executionId,
    nodeCount: sortedNodes.length,
    timestamp: new Date().toISOString(),
  });

  try {
    for (const nodeName of sortedNodes) {
      const dagNode = dag.nodes.get(nodeName);
      if (!dagNode) continue;
      if (dagNode.disabled) {
        const parentOutputs = getNodeInputs(dag, nodeName, nodeOutputs);
        nodeOutputs.set(nodeName, [parentOutputs[0] || { items: [{ json: {} }] }]);
        continue;
      }

      const nodeExecId = await executionRepo.createNodeExecution({
        executionId,
        nodeName,
        nodeType: dagNode.type,
      });

      sseService.emit(executionId, 'node:start', {
        nodeName,
        nodeType: dagNode.type,
        timestamp: new Date().toISOString(),
      });

      const startTime = Date.now();

      try {
        const inputs = getNodeInputs(dag, nodeName, nodeOutputs);

        if (triggerData && dag.triggers.includes(nodeName)) {
          inputs[0] = { items: [{ json: triggerData }] };
        }

        const context: NodeExecutorContext = {
          nodeName,
          nodeType: dagNode.type,
          parameters: dagNode.parameters,
          credentials: undefined,
          input: inputs,
          allNodeOutputs: nodeOutputs,
        };

        const executor = executors[dagNode.type];
        let outputs: NodeOutput[];

        if (executor) {
          outputs = await executor(context);
        } else {
          outputs = [{
            items: [{
              json: {
                _warning: `Unsupported node type: ${dagNode.type}`,
                _passthrough: true,
                ...((inputs[0]?.items?.[0]?.json) || {}),
              },
            }],
          }];
        }

        nodeOutputs.set(nodeName, outputs);
        const executionTimeMs = Date.now() - startTime;

        await executionRepo.updateNodeExecution(nodeExecId, {
          status: 'success',
          inputData: JSON.stringify(inputs[0]?.items?.slice(0, 10)),
          outputData: JSON.stringify(outputs[0]?.items?.slice(0, 10)),
          executionTimeMs,
        });

        sseService.emit(executionId, 'node:complete', {
          nodeName,
          nodeType: dagNode.type,
          status: 'success',
          executionTimeMs,
          output: outputs[0]?.items?.slice(0, 5),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const executionTimeMs = Date.now() - startTime;
        const errorMsg = (err as Error).message;

        await executionRepo.updateNodeExecution(nodeExecId, {
          status: 'error',
          error: errorMsg,
          executionTimeMs,
        });

        sseService.emit(executionId, 'node:error', {
          nodeName,
          nodeType: dagNode.type,
          error: errorMsg,
          executionTimeMs,
          timestamp: new Date().toISOString(),
        });

        if (!dagNode.continueOnFail) {
          throw new Error(`Node "${nodeName}" failed: ${errorMsg}`);
        }

        nodeOutputs.set(nodeName, [{
          items: [{ json: { error: errorMsg, _continueOnFail: true } }],
        }]);
      }
    }

    await executionRepo.updateStatus(executionId, 'success');
    sseService.emit(executionId, 'execution:complete', {
      executionId,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = (err as Error).message;
    await executionRepo.updateStatus(executionId, 'error', errorMsg);
    sseService.emit(executionId, 'execution:error', {
      executionId,
      status: 'error',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
}

function getNodeInputs(
  dag: DAG,
  nodeName: string,
  nodeOutputs: Map<string, NodeOutput[]>
): Record<number, NodeInput> {
  const inputs: Record<number, NodeInput> = {};
  const incomingEdges = dag.edges.filter(e => e.to === nodeName);

  for (const edge of incomingEdges) {
    const parentOutputs = nodeOutputs.get(edge.from);
    if (!parentOutputs) continue;

    const outputData = parentOutputs[edge.fromOutput];
    if (!outputData) continue;

    if (!inputs[edge.toInput]) {
      inputs[edge.toInput] = { items: [] };
    }
    inputs[edge.toInput].items.push(...outputData.items);
  }

  if (Object.keys(inputs).length === 0) {
    inputs[0] = { items: [{ json: {} }] };
  }

  return inputs;
}
