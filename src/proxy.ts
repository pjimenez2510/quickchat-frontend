import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Proxy (Next.js 16 — antes "middleware"). Genera un nonce único por request
// y emite la cabecera Content-Security-Policy de forma dinámica, de modo que
// `script-src` use 'nonce-<valor>' + 'strict-dynamic' en lugar de
// 'unsafe-inline'. Next.js detecta el nonce en la CSP de la request y lo
// aplica automáticamente a sus scripts de bootstrap/hydration.
//
// Nota: `style-src` mantiene 'unsafe-inline' a propósito. Los nonces NO aplican
// a atributos `style="..."` (solo a bloques <style>), y la UI usa estilos
// inline dinámicos (emoji-mart, GIPHY, waveform de voz). Quitarlo rompería
// el render. Riesgo residual bajo: la inyección de CSS es mucho menos severa
// que la de scripts, y frame-ancestors/object-src/base-uri ya mitigan.

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
  // En dev, React/Turbopack usan eval() para HMR y stacks de error → unsafe-eval.
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(' ');

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
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
