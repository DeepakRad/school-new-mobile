import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  send: (body: string) => void;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export async function toWebRequest(req: VercelRequest): Promise<Request> {
  const protocol =
    (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `${protocol}://${host}`);
  const method = req.method ?? 'GET';
  const headers = Object.entries(req.headers).flatMap(([key, value]) => {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.map((entry) => [key, entry] as [string, string]);
    }

    return [[key, value] as [string, string]];
  });

  if (method === 'GET' || method === 'HEAD') {
    return new Request(url.toString(), { method, headers });
  }

  let body: string | undefined;
  if (typeof req.body === 'string') {
    body = req.body;
  } else if (req.body && typeof req.body === 'object') {
    body = JSON.stringify(req.body);
  } else if (req.body != null) {
    body = String(req.body);
  } else {
    body = await readRequestBody(req);
  }

  return new Request(url.toString(), {
    method,
    headers,
    body,
  });
}

export async function sendWebResponse(
  res: VercelResponse,
  response: Response,
): Promise<void> {
  res.statusCode = response.status;

  response.headers.forEach((value: string, key: string) => {
    res.setHeader(key, value);
  });

  const text = await response.text();
  res.send(text);
}

export function methodNotAllowedResponse(): Response {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: corsHeaders,
  });
}

export function optionsWebResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
