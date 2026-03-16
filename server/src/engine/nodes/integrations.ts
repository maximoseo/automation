import { NodeExecutorContext, NodeOutput } from './base';

function simulatedResponse(nodeType: string, operation: string, details: Record<string, unknown> = {}): NodeOutput[] {
  return [{
    items: [{
      json: {
        success: true,
        simulation: true,
        nodeType,
        operation,
        message: `[SIMULATED] ${nodeType} - ${operation} executed successfully`,
        timestamp: new Date().toISOString(),
        ...details,
      },
    }],
  }];
}

export async function executeEmailSend(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters } = context;
  // In a real implementation, we'd use nodemailer with SMTP credentials
  return simulatedResponse('emailSend', 'send', {
    from: parameters.fromEmail || 'noreply@example.com',
    to: parameters.toEmail || 'user@example.com',
    subject: parameters.subject || '(no subject)',
  });
}

export async function executeGoogleSheets(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, input } = context;
  const operation = (parameters.operation as string) || 'read';
  const items = input[0]?.items || [{ json: {} }];

  if (operation === 'read' || operation === 'getAll') {
    return simulatedResponse('googleSheets', operation, {
      sheetId: parameters.sheetId || parameters.documentId,
      sheetName: parameters.sheetName || 'Sheet1',
      sampleData: [
        { row: 1, col_a: 'Sample Value 1', col_b: 'Data 1' },
        { row: 2, col_a: 'Sample Value 2', col_b: 'Data 2' },
        { row: 3, col_a: 'Sample Value 3', col_b: 'Data 3' },
      ],
    });
  }

  return simulatedResponse('googleSheets', operation, {
    sheetId: parameters.sheetId || parameters.documentId,
    sheetName: parameters.sheetName || 'Sheet1',
    rowsAffected: items.length,
  });
}

export async function executeGoogleDrive(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters } = context;
  const operation = (parameters.operation as string) || 'list';

  return simulatedResponse('googleDrive', operation, {
    folderId: parameters.folderId || 'root',
    operation,
  });
}

export async function executeGoogleDriveTrigger(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters } = context;
  return simulatedResponse('googleDriveTrigger', 'trigger', {
    event: parameters.event || 'fileCreated',
    folderId: parameters.folderId || 'root',
    sampleFile: {
      id: 'simulated-file-id',
      name: 'sample-file.pdf',
      mimeType: 'application/pdf',
      createdTime: new Date().toISOString(),
    },
  });
}

export async function executeGoogleDocs(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters } = context;
  const operation = (parameters.operation as string) || 'create';

  return simulatedResponse('googleDocs', operation, {
    documentId: 'simulated-doc-id',
    title: parameters.title || 'Untitled Document',
  });
}

export async function executeSlack(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters } = context;
  const resource = (parameters.resource as string) || 'message';
  const operation = (parameters.operation as string) || 'post';

  return simulatedResponse('slack', `${resource}.${operation}`, {
    channel: parameters.channel || '#general',
    text: parameters.text || '',
    ts: Date.now().toString(),
  });
}

export async function executeTwitter(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters } = context;
  const operation = (parameters.operation as string) || 'create';

  return simulatedResponse('twitter', operation, {
    tweetId: `simulated-${Date.now()}`,
    text: parameters.text || '',
  });
}
