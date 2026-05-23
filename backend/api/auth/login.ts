import { handleAuthLogin } from '../../lib/handlers.js';
import { optionsResponse, withCors } from '../../lib/http.js';

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    return withCors(new Response('Method Not Allowed', { status: 405 }));
  }

  return withCors(await handleAuthLogin(request));
}
