import { DurableObject } from 'cloudflare:workers';
import files from './deck-assets.js';

export class App extends DurableObject {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const { pathname } = new URL(request.url);
    const path = pathname === '/' ? '/index.html' : pathname;
    const file = files[path];
    if (!file) return new Response('Not found', { status: 404 });
    const headers = {
      'Content-Type': file.type,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    };
    if (request.method === 'HEAD') return new Response(null, { headers });
    return new Response(Uint8Array.from(atob(file.data), character => character.charCodeAt(0)), { headers });
  }
}
