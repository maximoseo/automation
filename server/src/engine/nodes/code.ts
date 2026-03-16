import vm from 'vm';
import { NodeExecutorContext, NodeOutput } from './base';

export async function executeCode(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, input } = context;
  const jsCode = (parameters.jsCode as string) || 'return items;';
  const mode = (parameters.mode as string) || 'runOnceForAllItems';

  const inputItems = input[0]?.items || [{ json: {} }];

  if (mode === 'runOnceForEachItem') {
    const results: Array<{ json: Record<string, unknown> }> = [];
    for (let i = 0; i < inputItems.length; i++) {
      const item = inputItems[i];
      const sandbox = {
        $input: { item: { json: item.json }, all: () => inputItems, first: () => inputItems[0], last: () => inputItems[inputItems.length - 1] },
        $json: item.json,
        $item: item,
        $itemIndex: i,
        JSON, Math, Date, String, Number, Boolean, Array, Object,
        parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
        console: { log: () => {} },
      };
      const ctx = vm.createContext(sandbox);
      try {
        const result = vm.runInContext(`(function() { ${jsCode} })()`, ctx, { timeout: 30000 });
        if (result && typeof result === 'object') {
          if (Array.isArray(result)) {
            results.push(...result.map((r: unknown) => ({ json: (r as any)?.json || r as Record<string, unknown> })));
          } else {
            results.push({ json: (result as any)?.json || result as Record<string, unknown> });
          }
        } else {
          results.push({ json: { result } });
        }
      } catch (err) {
        throw new Error(`Code execution failed on item ${i}: ${(err as Error).message}`);
      }
    }
    return [{ items: results }];
  }

  // runOnceForAllItems
  const sandbox = {
    items: inputItems,
    $input: {
      all: () => inputItems,
      first: () => inputItems[0],
      last: () => inputItems[inputItems.length - 1],
      item: inputItems[0],
    },
    $json: inputItems[0]?.json || {},
    JSON, Math, Date, String, Number, Boolean, Array, Object,
    parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    console: { log: () => {} },
  };

  const ctx = vm.createContext(sandbox);
  try {
    const result = vm.runInContext(`(function() { ${jsCode} })()`, ctx, { timeout: 30000 });
    if (Array.isArray(result)) {
      return [{ items: result.map((r: unknown) => ({ json: (r as any)?.json || r as Record<string, unknown> })) }];
    }
    if (result && typeof result === 'object') {
      return [{ items: [{ json: (result as any)?.json || result as Record<string, unknown> }] }];
    }
    return [{ items: [{ json: { result } }] }];
  } catch (err) {
    throw new Error(`Code execution failed: ${(err as Error).message}`);
  }
}
