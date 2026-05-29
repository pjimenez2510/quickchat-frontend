import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SONNER_STYLE_HASH } from '@/lib/sonner-csp-hash';

// Proxy (Next.js 16 — antes "middleware"). Genera un nonce único por request
// y emite la cabecera Content-Security-Policy de forma dinámica, de modo que
// `script-src` use 'nonce-<valor>' + 'strict-dynamic' en lugar de
// 'unsafe-inline'. Next.js detecta el nonce en la CSP de la request y lo
// aplica automáticamente a sus scripts de bootstrap/hydration.
//
// `style-src` también evita 'unsafe-inline':
//   - 'nonce-<valor>' cubre los <style> que inyecta Next.js (los nonce-a igual
//     que los scripts).
//   - El hash de sonner cubre el <style> que esa librería inyecta en runtime
//     (no soporta nonce). Se regenera en build (scripts/generate-sonner-csp-hash.mjs).
//   - Los `style="..."` SSR se eliminaron del código (se usan clases Tailwind);
//     los estilos dinámicos restantes (p. ej. posición del menú contextual) se
//     aplican en cliente vía CSSOM, que CSP no restringe.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3002';

/** Orígenes permitidos en connect-src, sin duplicados (corrige el aviso ZAP). */
function buildConnectSrc(): string {
  const wsConnect = WS_URL.replace(/^http/, 'ws');
  const origins = [
    "'self'",
    API_URL,
    WS_URL,
    wsConnect,
    'https://api.giphy.com',
    'https://*.amazonaws.com',
  ];
  return [...new Set(origins)].join(' ');
}

function buildCsp(nonce: string, isDev: boolean): string {
  // En desarrollo, Turbopack/React inyectan scripts y estilos para HMR y el
  // error overlay que no llevan nonce. Como un nonce/hash presente hace que el
  // navegador IGNORE 'unsafe-inline', en dev usamos una CSP permisiva. La CSP
  // estricta (la que audita ZAP) aplica solo en producción.
  const scriptSrc = isDev
    ? `'self' 'unsafe-inline' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  // EMPTY_STYLE_HASH: sha256 del string vacío. Sonner (y los placeholders de
  // precedencia CSS de Next) insertan un <style> vacío antes de rellenarlo;
  // ese estado transitorio dispara una violación. Whitelistear el <style> vacío
  // es inocuo (no contiene reglas) y silencia el aviso. No es 'unsafe-inline',
  // así que no reactiva el flag de ZAP.
  const EMPTY_STYLE_HASH = 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
  const styleSrc = isDev
    ? `'self' 'unsafe-inline'`
    : `'self' 'nonce-${nonce}' '${SONNER_STYLE_HASH}' '${EMPTY_STYLE_HASH}'`;

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src 'self' data: blob: https://*.amazonaws.com https://media.giphy.com https://media0.giphy.com https://media1.giphy.com https://media2.giphy.com https://media3.giphy.com https://media4.giphy.com`,
    `font-src 'self' data:`,
    `connect-src ${buildConnectSrc()}`,
    `media-src 'self' blob: https://*.amazonaws.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const csp = buildCsp(nonce, isDev);

  // Next.js lee la CSP desde la request para extraer el nonce e inyectarlo
  // en sus <script>. Por eso debe ir tanto en request como en response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    // Aplica a páginas HTML; excluye rutas API, assets estáticos y prefetches
    // (que no necesitan la CSP con nonce y no deben pagar render dinámico).
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
