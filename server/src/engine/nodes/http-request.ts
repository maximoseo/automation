import axios, { AxiosRequestConfig, Method } from 'axios';
import { NodeExecutorContext, NodeOutput } from './base';

export async function executeHttpRequest(context: NodeExecutorContext): Promise<NodeOutput[]> {
  const { parameters, credentials, input } = context;
  const items = input[0]?.items || [{ json: {} }];
  const results: Array<{ json: Record<string, unknown> }> = [];

  for (const item of items) {
    let url = parameters.url as string || '';
    const method = ((parameters.method as string) || 'GET').toUpperCase() as Method;

    // Resolve URL if it contains item references (simple template)
    if (url.includes('{{') && item.json) {
      url = url.replace(/\{\{\s*\$json\.(\w+)\s*\}\}/g, (_match, key) => {
        return String((item.json as Record<string, unknown>)[key] || '');
      });
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      timeout: ((parameters.timeout as number) || 30) * 1000,
      headers: {} as Record<string, string>,
    };

    // Auth
    if (credentials) {
      const auth = parameters.authentication as string;
      if (auth === 'httpBasicAuth' && credentials.httpBasicAuth) {
        const creds = credentials.httpBasicAuth as Record<string, string>;
        config.auth = { username: creds.user, password: creds.password };
      } else if (auth === 'httpHeaderAuth' && credentials.httpHeaderAuth) {
        const creds = credentials.httpHeaderAuth as Record<string, string>;
        (config.headers as Record<string, string>)[creds.name] = creds.value;
      } else if (auth === 'httpBearerAuth' && credentials.httpBearerAuth) {
        const creds = credentials.httpBearerAuth as Record<string, string>;
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${creds.token}`;
      }
    }

    // Headers
    const sendHeaders = parameters.sendHeaders as boolean;
    if (sendHeaders && parameters.headerParameters) {
      const headerParams = parameters.headerParameters as { parameters: Array<{ name: string; value: string }> };
      if (headerParams.parameters) {
        for (const h of headerParams.parameters) {
          (config.headers as Record<string, string>)[h.name] = h.value;
        }
      }
    }

    // Query params
    const sendQuery = parameters.sendQuery as boolean;
    if (sendQuery && parameters.queryParameters) {
      const queryParams = parameters.queryParameters as { parameters: Array<{ name: string; value: string }> };
      if (queryParams.parameters) {
        config.params = {};
        for (const q of queryParams.parameters) {
          config.params[q.name] = q.value;
        }
      }
    }

    // Body
    const sendBody = parameters.sendBody as boolean;
    if (sendBody) {
      const bodyType = parameters.contentType as string;
      if (bodyType === 'json' || !bodyType) {
        config.data = parameters.body as unknown || parameters.bodyParametersJson as unknown || item.json;
        (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
      } else if (bodyType === 'form-urlencoded') {
        config.data = parameters.bodyParametersUi as unknown;
      } else {
        config.data = parameters.body as unknown;
      }
    }

    // For methods that need body, use item data if not configured
    if (['POST', 'PUT', 'PATCH'].includes(method) && !config.data) {
      config.data = item.json;
    }

    try {
      const response = await axios(config);
      results.push({
        json: {
          statusCode: response.status,
          headers: response.headers,
          body: response.data,
          ...(typeof response.data === 'object' && response.data !== null ? response.data : { data: response.data }),
        },
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data: unknown }; message: string };
      if (axiosErr.response) {
        results.push({
          json: {
            statusCode: axiosErr.response.status,
            error: true,
            body: axiosErr.response.data,
            message: axiosErr.message,
          },
        });
      } else {
        throw new Error(`HTTP Request failed: ${axiosErr.message}`);
      }
    }
  }

  return [{ items: results }];
}
