import vm from 'vm';

export interface ExpressionContext {
  $json: Record<string, unknown>;
  $input: { all: () => unknown[]; first: () => unknown; last: () => unknown; item: unknown };
  $node: Record<string, { json: unknown }>;
  $env: Record<string, string>;
  $now: Date;
  $today: Date;
  $runIndex: number;
  $itemIndex: number;
}

export function evaluateExpression(expression: string, context: ExpressionContext): unknown {
  // Handle n8n expression syntax: ={{ expression }}
  const exprMatch = expression.match(/^\s*=\{\{(.+)\}\}\s*$/s);
  if (!exprMatch) return expression;

  const code = exprMatch[1].trim();

  const sandbox = {
    $json: context.$json,
    $input: context.$input,
    $node: context.$node,
    $env: context.$env || {},
    $now: context.$now || new Date(),
    $today: context.$today || new Date(),
    $runIndex: context.$runIndex || 0,
    $itemIndex: context.$itemIndex || 0,
    JSON,
    Math,
    Date,
    String,
    Number,
    Boolean,
    Array,
    Object,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent,
    isNaN,
    isFinite,
  };

  try {
    const ctx = vm.createContext(sandbox);
    const result = vm.runInContext(code, ctx, { timeout: 5000 });
    return result;
  } catch (err) {
    throw new Error(`Expression evaluation failed: ${(err as Error).message}\nExpression: ${code}`);
  }
}

export function resolveParameters(params: Record<string, unknown>, context: ExpressionContext): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    resolved[key] = resolveValue(value, context);
  }
  return resolved;
}

function resolveValue(value: unknown, context: ExpressionContext): unknown {
  if (typeof value === 'string') {
    // Check for expressions within strings
    if (value.includes('={{')) {
      // Handle full expression
      if (value.match(/^\s*=\{\{(.+)\}\}\s*$/s)) {
        return evaluateExpression(value, context);
      }
      // Handle embedded expressions like "Hello {{ $json.name }}"
      return value.replace(/=\{\{(.+?)\}\}/g, (_match, expr) => {
        try {
          const result = evaluateExpression(`={{ ${expr} }}`, context);
          return String(result);
        } catch {
          return _match;
        }
      });
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(v => resolveValue(v, context));
  }
  if (value && typeof value === 'object') {
    return resolveParameters(value as Record<string, unknown>, context);
  }
  return value;
}
