import { jsonResponse } from './response';

export function withCors(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  );
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  return response;
}

export function optionsResponse(): Response {
  return withCors(jsonResponse({}, { status: 200 }));
}
