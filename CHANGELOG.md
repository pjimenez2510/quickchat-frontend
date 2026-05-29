# Changelog

Todas las modificaciones notables de este proyecto se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Security

- **CSP estricta sin `unsafe-inline`/`unsafe-eval`** emitida por request desde
  `src/proxy.ts` (Next.js 16 Proxy):
  - `script-src` usa `'nonce-<aleatorio>' 'strict-dynamic'`.
  - `style-src` usa `'nonce-<aleatorio>'` + hash SHA-256 del CSS que inyecta
    `sonner` (calculado en build) + hash del `<style>` vacío transitorio.
  - Resuelve las alertas de OWASP ZAP: *CSP script-src unsafe-inline* (Medium),
    *CSP style-src unsafe-inline* (Medium) y *CSP duplicate host* (Low).
  - Verificado con Chrome headless: 0 violaciones CSP en `/`, `/login`,
    `/register`.

### Changed

- Estilos inline estáticos (`style={{...}}`) migrados a **clases Tailwind** para
  cumplir la CSP (sin atributos `style="..."` en SSR).
- Zod configurado en modo `jitless` (`src/lib/zod-config.ts`) para evitar el uso
  de `eval` bajo la CSP estricta.
- `next.config.ts`: la CSP se traslada a `proxy.ts`; se conservan los headers de
  seguridad estáticos (HSTS, X-Frame-Options, Referrer-Policy, etc.).
- Root layout forzado a render dinámico (`force-dynamic`) para soportar el nonce.

### Added

- `scripts/generate-sonner-csp-hash.mjs` + hooks `prebuild`/`predev` que
  regeneran el hash CSP de `sonner` en cada build.
- Documentación: `README.md` reescrito, `.env.example`, este `CHANGELOG.md`,
  ADR `docs/adr/0001-csp-nonce-hardening.md`, guía de funcionalidades y
  arquitectura `docs/features.md` (incluye llamadas WebRTC y eventos Socket.io) y
  `docs/transport-encryption.md` (cifrado QCipher, qué se cifra y advertencias).

---

## Historial de funcionalidades (previo a versionado)

### Added

- Llamadas de audio/vídeo con WebRTC (UI + señalización, servidores ICE/TURN).
- Página de ajustes de perfil con subida de avatar.
- Búsqueda de mensajes, reenvío y scroll infinito.
- Acciones sobre mensajes: menú contextual, responder, editar, eliminar,
  reacciones y fijar.
- Indicadores de estado de mensaje (✓ enviado, ✓✓ entregado, ✓✓ azul leído).
- Adjuntos de archivos, subida de multimedia y grabación de voz.
- Selector de emojis, búsqueda de GIFs y galería de stickers.
- UI de chat estilo Messenger con sidebar y mensajería en tiempo real.
- Autenticación (login/registro) con guard bidireccional.
- Cliente WebSocket (socket.io-client) con provider y hook `useSocket`.
- Setup inicial del frontend con tema Messenger.

[Unreleased]: https://github.com/pjimenez2510/quickchat-frontend/commits/main
