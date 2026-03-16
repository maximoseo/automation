import { NodeExecutorContext, NodeOutput } from './base';

export async function executeScheduleTrigger(context: NodeExecutorContext): Promise<NodeOutput[]> {
  return [{
    items: [{
      json: {
        trigger: 'schedule',
        triggerTime: new Date().toISOString(),
        message: 'Manual execution of schedule trigger',
      },
    }],
  }];
}

export async function executeWebhook(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, input } = context;
  // If there's input data (from a real webhook call), use it
  const inputItems = input[0]?.items;
  if (inputItems && inputItems.length > 0) {
    return [{ items: inputItems }];
  }

  // Otherwise generate test data
  return [{
    items: [{
      json: {
        trigger: 'webhook',
        httpMethod: parameters.httpMethod || 'POST',
        path: parameters.path || '/',
        headers: {},
        body: {},
        query: {},
        triggerTime: new Date().toISOString(),
        message: 'Manual execution of webhook trigger',
      },
    }],
  }];
}

export async function executeRespondToWebhook(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, input } = context;
  const items = input[0]?.items || [{ json: {} }];

  const responseData = {
    respondWith: parameters.respondWith || 'json',
    statusCode: parameters.statusCode || 200,
    responseBody: parameters.respondWith === 'json' ? (parameters.responseBody || items[0]?.json || {}) : parameters.responseBody,
    responded: true,
    timestamp: new Date().toISOString(),
  };

  return [{ items: [{ json: responseData }] }];
}
