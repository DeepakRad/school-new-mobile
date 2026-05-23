import type { IncomingMessage, ServerResponse } from 'node:http';

import { handleAuthLogin } from '../../backend/lib/handlers.js';
import {
  methodNotAllowedResponse,
  optionsWebResponse,
  sendWebResponse,
  toWebRequest,
} from '../../backend/lib/vercel.js';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const request = await toWebRequest(req);
  if (request.method === 'OPTIONS') {
    await sendWebResponse(
      res as ServerResponse & { send: (body: string) => void },
      optionsWebResponse(),
    );
    return;
  }
  if (request.method !== 'POST') {
    await sendWebResponse(
      res as ServerResponse & { send: (body: string) => void },
      methodNotAllowedResponse(),
    );
    return;
  }

  await sendWebResponse(
    res as ServerResponse & { send: (body: string) => void },
    await handleAuthLogin(request),
  );
}
