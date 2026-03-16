import { NodeExecutorContext, NodeOutput } from './base';

export async function executeIf(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, input } = context;
  const items = input[0]?.items || [{ json: {} }];
  const trueItems: Array<{ json: Record<string, unknown> }> = [];
  const falseItems: Array<{ json: Record<string, unknown> }> = [];

  const conditions = parameters.conditions as Record<string, unknown> || {};

  for (const item of items) {
    let result = false;

    // n8n v2 conditions format
    if (conditions.options) {
      const opts = conditions.options as Array<{ leftValue: unknown; rightValue: unknown; operator: { type: string; operation: string } }>;
      result = evaluateConditions(opts, item.json);
    }
    // n8n v1 conditions format
    else {
      const stringConditions = (conditions.string || []) as Array<{ value1: string; value2: string; operation: string }>;
      const numberConditions = (conditions.number || []) as Array<{ value1: number; value2: number; operation: string }>;
      const booleanConditions = (conditions.boolean || []) as Array<{ value1: boolean; value2: boolean }>;

      const combineOp = (parameters.combineOperation as string) || 'all';
      const results: boolean[] = [];

      for (const cond of stringConditions) {
        results.push(evaluateStringCondition(resolveField(cond.value1, item.json), resolveField(cond.value2, item.json), cond.operation));
      }
      for (const cond of numberConditions) {
        results.push(evaluateNumberCondition(Number(resolveField(cond.value1, item.json)), Number(resolveField(cond.value2, item.json)), cond.operation));
      }
      for (const cond of booleanConditions) {
        const v1 = resolveField(cond.value1, item.json);
        const v2 = resolveField(cond.value2, item.json);
        results.push(Boolean(v1) === Boolean(v2));
      }

      if (results.length === 0) {
        result = true; // No conditions = true
      } else if (combineOp === 'any') {
        result = results.some(r => r);
      } else {
        result = results.every(r => r);
      }
    }

    if (result) {
      trueItems.push(item);
    } else {
      falseItems.push(item);
    }
  }

  return [
    { items: trueItems.length > 0 ? trueItems : [{ json: {} }] },
    { items: falseItems.length > 0 ? falseItems : [{ json: {} }] },
  ];
}

export async function executeSwitch(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, input } = context;
  const items = input[0]?.items || [{ json: {} }];
  const rules = parameters.rules as { values?: Array<{ conditions?: Array<{ leftValue: unknown; rightValue: unknown; operator?: { type: string; operation: string }; operation?: string }>; output: number }> } | undefined;
  const outputCount = Math.max(4, (rules?.values?.length || 0) + 1);
  const outputs: NodeOutput[] = Array.from({ length: outputCount }, () => ({ items: [] }));

  const fallbackOutput = (parameters.fallbackOutput as number) ?? outputCount - 1;

  for (const item of items) {
    let matched = false;
    if (rules?.values) {
      for (const rule of rules.values) {
        const ruleConditions = rule.conditions || [];
        let ruleMatch = true;
        for (const cond of ruleConditions) {
          const left = resolveField(cond.leftValue, item.json);
          const right = resolveField(cond.rightValue, item.json);
          if (!evaluateStringCondition(String(left), String(right), cond.operation || cond.operator?.operation || 'equals')) {
            ruleMatch = false;
            break;
          }
        }
        if (ruleMatch && ruleConditions.length > 0) {
          const outputIndex = rule.output ?? 0;
          if (outputs[outputIndex]) {
            outputs[outputIndex].items.push(item);
          }
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      if (outputs[fallbackOutput]) {
        outputs[fallbackOutput].items.push(item);
      }
    }
  }

  return outputs;
}

export async function executeMerge(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, input } = context;
  const mode = (parameters.mode as string) || 'append';
  const input1Items = input[0]?.items || [];
  const input2Items = input[1]?.items || [];

  let items: Array<{ json: Record<string, unknown> }>;

  switch (mode) {
    case 'append':
      items = [...input1Items, ...input2Items];
      break;
    case 'combine':
    case 'mergeByIndex': {
      items = [];
      const maxLen = Math.max(input1Items.length, input2Items.length);
      for (let i = 0; i < maxLen; i++) {
        const json1 = input1Items[i]?.json || {};
        const json2 = input2Items[i]?.json || {};
        items.push({ json: { ...json1, ...json2 } });
      }
      break;
    }
    case 'passthrough':
      items = input1Items.length > 0 ? input1Items : input2Items;
      break;
    default:
      items = [...input1Items, ...input2Items];
  }

  return [{ items: items.length > 0 ? items : [{ json: {} }] }];
}

export async function executeSplitInBatches(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, input } = context;
  const batchSize = (parameters.batchSize as number) || 10;
  const items = input[0]?.items || [{ json: {} }];

  // For the workflow builder, we output all items as individual batches
  const batches: Array<{ json: Record<string, unknown> }> = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    batches.push(...batch);
  }

  // Output 0: next batch, Output 1: done
  return [
    { items: batches },
    { items: [{ json: { done: true, totalItems: items.length, batchSize } }] },
  ];
}

export async function executeNoOp(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const items = context.input[0]?.items || [{ json: {} }];
  return [{ items }];
}

// Helpers
function resolveField(value: unknown, json: Record<string, unknown>): unknown {
  if (typeof value === 'string' && value.startsWith('={{')) {
    // Simple expression resolution
    const expr = value.slice(3, -2).trim();
    if (expr.startsWith('$json.') || expr.startsWith('$json[')) {
      const path = expr.replace('$json.', '').replace('$json[', '').replace(']', '').replace(/['"]/g, '');
      return getNestedValue(json, path);
    }
    return value;
  }
  return value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function evaluateStringCondition(value1: unknown, value2: unknown, operation: string): boolean {
  const v1 = String(value1 ?? '');
  const v2 = String(value2 ?? '');
  switch (operation) {
    case 'equals': case 'equal': return v1 === v2;
    case 'notEquals': case 'notEqual': return v1 !== v2;
    case 'contains': return v1.includes(v2);
    case 'notContains': return !v1.includes(v2);
    case 'startsWith': return v1.startsWith(v2);
    case 'endsWith': return v1.endsWith(v2);
    case 'regex': return new RegExp(v2).test(v1);
    case 'isEmpty': return v1.length === 0;
    case 'isNotEmpty': return v1.length > 0;
    case 'exists': return value1 !== undefined && value1 !== null;
    case 'notExists': return value1 === undefined || value1 === null;
    default: return v1 === v2;
  }
}

function evaluateNumberCondition(value1: number, value2: number, operation: string): boolean {
  switch (operation) {
    case 'equals': case 'equal': return value1 === value2;
    case 'notEquals': case 'notEqual': return value1 !== value2;
    case 'larger': case 'gt': return value1 > value2;
    case 'largerEqual': case 'gte': return value1 >= value2;
    case 'smaller': case 'lt': return value1 < value2;
    case 'smallerEqual': case 'lte': return value1 <= value2;
    default: return value1 === value2;
  }
}

function evaluateConditions(options: Array<{ leftValue: unknown; rightValue: unknown; operator: { type: string; operation: string } }>, json: Record<string, unknown>): boolean {
  for (const opt of options) {
    const left = resolveField(opt.leftValue, json);
    const right = resolveField(opt.rightValue, json);
    const opType = opt.operator?.type || 'string';
    const operation = opt.operator?.operation || 'equals';

    if (opType === 'number') {
      if (!evaluateNumberCondition(Number(left), Number(right), operation)) return false;
    } else {
      if (!evaluateStringCondition(left, right, operation)) return false;
    }
  }
  return true;
}
