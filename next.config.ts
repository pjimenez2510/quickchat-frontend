import type { NextConfig } from 'next';

// La cabecera Content-Security-Policy se emite por request desde `src/proxy.ts`
// para poder usar un nonce único en `script-src` (en vez de 'unsafe-inline').
// Aquí solo quedan los headers de seguridad estáticos, iguales para toda
// respuesta. No dupliques la CSP aquí: el navegador aplicaría la combinación
// más restrictiva y romperías el nonce.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()',
  },
  { key: 'Cache-Control', value: 'no-store, max-age=0' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['bbe6-2800-bf0-3014-106c-c8ba-ed42-13eb-d6e6.ngrok-free.app'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
