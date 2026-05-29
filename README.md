# QuickChat — Frontend

Aplicación de mensajería en tiempo real estilo Messenger. Este repositorio es el
**frontend** (Next.js + Tailwind + shadcn/ui). El backend vive en
[`quickchat-backend`](https://github.com/pjimenez2510/quickchat-backend).

## Stack

- **Next.js 16** (App Router) + TypeScript (strict) — bundler **Turbopack**
- **Tailwind CSS v4** + shadcn/ui (Base UI)
- **Zustand** (estado local) + **TanStack Query** (estado servidor)
- **React Hook Form** + **Zod** (formularios y validación)
- **socket.io-client** (mensajería en tiempo real)
- **sonner** (toasts) · **lucide-react** (iconos)
- WebRTC para llamadas (TURN/STUN)

## Requisitos

- Node.js ≥ 20
- El backend (`quickchat-backend`) corriendo y accesible

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env
#   y rellenar los valores (ver tabla abajo)

# 3. Levantar en desarrollo (http://localhost:3000)
npm run dev
```

Para una build de producción:

```bash
npm run build
npm run start
```

> El script `prebuild`/`predev` regenera automáticamente el hash CSP de `sonner`
> (ver [Seguridad / CSP](#seguridad--csp)). No necesitas ejecutarlo a mano.

## Variables de entorno

Todas son `NEXT_PUBLIC_*` (visibles en el navegador). Ver `.env.example`.

| Variable | Descripción | Obligatoria |
|----------|-------------|:-----------:|
| `NEXT_PUBLIC_API_URL` | URL del backend (REST) | Sí |
| `NEXT_PUBLIC_WS_URL` | URL del WebSocket (Socket.io) | Sí |
| `NEXT_PUBLIC_GIPHY_API_KEY` | API key pública de Giphy | Sí |
| `NEXT_PUBLIC_TURN_USERNAME` | Usuario del servidor TURN (llamadas) | No (local) |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | Credencial del servidor TURN | No (local) |
| `NEXT_PUBLIC_CRYPTO_TRANSPORT_KEY` | Clave de transporte QCipher. Debe coincidir con el backend | Sí |

## Scripts

| Script | Acción |
|--------|--------|
| `npm run dev` | Servidor de desarrollo (Turbopack, HMR) |
| `npm run build` | Build de producción |
| `npm run start` | Sirve la build de producción |
| `npm run lint` | ESLint |
| `npm run csp:sonner-hash` | Regenera el hash CSP del CSS de `sonner` |

## Estructura

```
src/
├── app/                 # App Router (rutas, layouts)
│   ├── (auth)/          #   login / register (guard bidireccional)
│   └── (chat)/          #   app principal (requiere sesión)
├── components/          # UI: chat, sidebar, calls, ui (shadcn)
├── hooks/               # useSocket, useCall, ...
├── lib/                 # api, socket, utils, config
├── stores/              # Zustand stores (auth, ...)
├── types/               # tipos compartidos
└── proxy.ts             # CSP por request (nonce) — ver Seguridad
scripts/
└── generate-sonner-csp-hash.mjs   # hash CSP de sonner (prebuild)
```

## Seguridad / CSP

La aplicación aplica una **Content Security Policy estricta** en producción,
emitida por request desde `src/proxy.ts`:

- `script-src 'self' 'nonce-<aleatorio>' 'strict-dynamic'` — sin `'unsafe-inline'`
  ni `'unsafe-eval'`. Next.js inyecta el nonce en sus scripts de hydration.
- `style-src 'self' 'nonce-<aleatorio>' 'sha256-<sonner>' 'sha256-<vacío>'` — sin
  `'unsafe-inline'`. El hash de `sonner` se calcula en build (no soporta nonce).
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `upgrade-insecure-requests`.

Implicaciones para el desarrollo:

- El uso de nonce obliga a **render dinámico** de las páginas (no estático/ISR).
- No uses atributos `style="..."` en SSR: usa **clases Tailwind**. Los estilos
  dinámicos en cliente se aplican vía CSSOM (`element.style`), que CSP no
  restringe.
- Zod corre en modo `jitless` (`src/lib/zod-config.ts`) para no usar `eval`.

Decisión documentada en
[`docs/adr/0001-csp-nonce-hardening.md`](docs/adr/0001-csp-nonce-hardening.md).

## Flujo de trabajo

- `main` protegida — todo cambio entra por **feature branch → PR → review → merge**.
- Conventional Commits.

## Licencia

Privado — QuickChat.
