# QuickChat — Funcionalidades y arquitectura

Documento de referencia para entender **qué hace** la aplicación, **qué
funcionalidades** tiene y **cómo** está construida. Cubre el frontend
(`quickchat-frontend`) y su interacción con el backend (`quickchat-backend`).

## Qué es QuickChat

Aplicación de **mensajería 1:1 en tiempo real** estilo Facebook Messenger, con
multimedia, indicadores de estado, acciones sobre mensajes y **llamadas de
audio/vídeo** por WebRTC. Comunicación en tiempo real vía **Socket.io** y un
**cifrado de transporte** simétrico sobre REST y WebSocket.

> Alcance: solo conversaciones **1:1** (no hay grupos).

## Rutas (App Router)

| Ruta | Grupo | Acceso | Descripción |
|------|-------|--------|-------------|
| `/login` | `(auth)` | Público | Inicio de sesión |
| `/register` | `(auth)` | Público | Registro |
| `/` | `(chat)` | Privado | App principal (lista de conversaciones) |
| `/chat/[conversationId]` | `(chat)` | Privado | Conversación abierta |
| `/settings/profile` | `(chat)` | Privado | Ajustes de perfil |

**Guard bidireccional:** `(chat)` redirige a `/login` si no hay sesión, y `(auth)`
redirige a `/` si ya hay sesión.

## Catálogo de funcionalidades

### 1. Autenticación
- Registro e inicio de sesión con JWT (access token en `localStorage`).
- Guard de rutas bidireccional.
- El `accessToken` se envía como `Authorization: Bearer` (REST) y en
  `socket.auth.token` (WebSocket).

### 2. Perfil de usuario
- Página de ajustes (`/settings/profile`) con edición de datos y **subida de
  avatar** (hook `use-upload.ts`).
- Estado online y "última conexión".

### 3. Conversaciones (sidebar)
- Lista de conversaciones con avatar, último mensaje y hora (`sidebar.tsx`,
  `conversation-item.tsx`).
- Indicador de **online** (punto verde).
- Búsqueda de conversaciones.
- Responsive: en móvil, sidebar y chat son vistas separadas.

### 4. Mensajería core
Componentes: `chat-panel.tsx`, `message-list.tsx`, `message-bubble.tsx`,
`message-input.tsx`.
- **Texto** con burbujas estilo Messenger (enviado azul / recibido gris).
- **Multimedia**: imágenes, vídeos y archivos adjuntos (subida vía `use-upload`).
- **Notas de voz**: grabación con `voice-recorder.tsx`.
- **Emojis**: `emoji-picker.tsx`.
- **GIFs**: búsqueda con Giphy (`gif-picker.tsx`).
- **Stickers**: galería (`sticker-picker.tsx`).
- Scroll infinito (carga de mensajes antiguos).
- Atajos de teclado: Enter = enviar, Shift+Enter = nueva línea, Escape = cerrar.

### 5. Indicadores de estado
Componente `message-status.tsx`.
- ✓ enviado · ✓✓ entregado · ✓✓ (azul) leído.
- **Typing**: indicador "escribiendo…" en tiempo real.
- Cambios de estado online de los contactos.

### 6. Acciones sobre mensajes
`context-menu.tsx` (click derecho / pulsación larga) + modales:
- **Responder** (`reply-bar.tsx`), **copiar**, **editar** (`edit-message-modal.tsx`),
  **eliminar** (para mí / para todos).
- **Reaccionar** con emojis rápidos.
- **Fijar / desfijar** (`pinned-messages-panel.tsx`).
- **Reenviar** a otra conversación (`forward-modal.tsx`).

### 7. Búsqueda y gestión
- Búsqueda de mensajes dentro de la conversación (`search-messages.tsx`).
- Reenvío de mensajes y panel de mensajes fijados.

### 8. Llamadas de audio/vídeo (WebRTC)
Ver sección [Llamadas (WebRTC)](#llamadas-webrtc).

## Tiempo real (Socket.io)

Conexión gestionada por `socket-provider.tsx` + `socket-connector.tsx`; el cliente
está en `src/lib/socket.ts` y el hook `use-socket.ts`. **Todo el payload de los
eventos (no reservados) viaja cifrado** (ver
[cifrado de transporte](transport-encryption.md)).

### Eventos cliente → servidor
| Evento | Propósito |
|--------|-----------|
| `message:send` | Enviar mensaje |
| `message:edit` | Editar mensaje |
| `message:delete` | Eliminar mensaje |
| `message:forward` | Reenviar mensaje |
| `message:read` | Marcar conversación/mensaje como leído |
| `typing:start` / `typing:stop` | Indicador de "escribiendo" |

### Eventos servidor → cliente
| Evento | Propósito |
|--------|-----------|
| `message:new` | Nuevo mensaje |
| `message:updated` | Mensaje editado |
| `message:deleted` | Mensaje eliminado |
| `message:delivered` | Confirmación de entrega |
| `message:read` | Read receipt |
| `message:reaction` | Reacción a un mensaje |
| `user:online` | Cambio de estado online / última conexión |
| `user:typing` | Otro usuario está escribiendo |

## Llamadas (WebRTC)

Llamadas **1:1** de audio o vídeo. Componentes: `call-manager.tsx` (registra la
señalización global), `incoming-call-modal.tsx` (llamada entrante) y
`active-call-screen.tsx` (llamada en curso). Lógica en `src/hooks/use-call.ts` y
estado en `stores/call-store.ts`.

### Tecnología
- **API nativa `RTCPeerConnection`** del navegador (sin librería externa).
- **`getUserMedia`** para audio (y vídeo 1280×720 en videollamada).
- **Compartir pantalla** (`getDisplayMedia`) durante la llamada.
- **Servidores ICE**:
  - STUN públicos de Google (`stun.l.google.com:19302`, …).
  - **TURN** de `metered.ca` (puertos 80, 443 y `turns:` TCP) si se definen
    `NEXT_PUBLIC_TURN_USERNAME` / `NEXT_PUBLIC_TURN_CREDENTIAL`.
- **Señalización** vía los eventos `call:*` de Socket.io (también cifrados).

### Eventos de señalización
| Dirección | Evento | Propósito |
|-----------|--------|-----------|
| C→S | `call:initiate` | Iniciar llamada (ack → `call:initiated`) |
| C→S | `call:answer` | El receptor acepta |
| C→S | `call:reject` | El receptor rechaza |
| C→S | `call:end` | Colgar |
| C→S | `call:offer` | SDP offer (lo envía quien llama) |
| C→S | `call:answer-sdp` | SDP answer (lo envía quien recibe) |
| C→S | `call:ice-candidate` | Candidato ICE |
| S→C | `call:incoming` | Llamada entrante |
| S→C | `call:accepted` | El receptor aceptó (dispara la oferta) |
| S→C | `call:rejected` / `call:ended` | Rechazada / finalizada |
| S→C | `call:offer` / `call:answer-sdp` / `call:ice-candidate` | Reenvío de señalización al peer |

### Flujo de una llamada
1. **Quien llama** ejecuta `getUserMedia` y emite `call:initiate`.
2. El servidor avisa al **receptor** con `call:incoming` → se muestra el modal.
3. El receptor acepta: crea su `RTCPeerConnection`, añade sus pistas y emite
   `call:answer`.
4. El servidor notifica a quien llama con `call:accepted`. Solo entonces quien
   llama crea su PC, genera el **offer** (`createOffer` → `setLocalDescription`) y
   lo envía con `call:offer`.
5. El receptor aplica el offer (`setRemoteDescription`), crea el **answer**
   (`createAnswer`) y lo envía con `call:answer-sdp`.
6. Ambos intercambian **candidatos ICE** (`call:ice-candidate`). Los candidatos que
   llegan antes de la descripción remota se **encolan** y se aplican después.
7. Al recibir las pistas remotas (`ontrack`) se muestra el audio/vídeo del otro.
8. `call:end` / `call:reject` limpian el `RTCPeerConnection` y detienen el stream
   local.

> Las credenciales TURN son opcionales en local (con STUN basta en la misma red),
> pero **necesarias** para atravesar NAT/firewalls en producción.

## Cifrado de transporte

El payload de **REST** y **WebSocket** se cifra con **QCipher** (simétrico, clave
compartida con el backend). Es **ofuscación en tránsito, no E2E**: el servidor
descifra y guarda los mensajes en texto plano. Detalle completo y advertencias de
seguridad en **[`transport-encryption.md`](transport-encryption.md)**.

## Estado de la aplicación

- **Zustand** (`stores/`):
  - `auth-store.ts` — sesión y usuario.
  - `chat-store.ts` — conversación activa, mensajes, typing.
  - `call-store.ts` — estado de la llamada (idle/incoming/active), streams.
- **TanStack Query** — estado de servidor (fetching/caché de datos REST).
- **React Hook Form + Zod** — formularios y validación (Zod en modo `jitless`,
  ver seguridad).

## Seguridad

- **CSP estricta** por request (nonce + hash), sin `'unsafe-inline'`/`'unsafe-eval'`
  en producción. Ver [`adr/0001-csp-nonce-hardening.md`](adr/0001-csp-nonce-hardening.md)
  y la sección *Seguridad / CSP* del README.
- Cabeceras: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, COOP/CORP.
- Cifrado de transporte QCipher (ver arriba).
- Auth por JWT con guard bidireccional.

## Mapa de carpetas (resumen)

```
src/
├── app/                      # rutas y layouts (App Router)
│   ├── (auth)/               #   login, register
│   └── (chat)/               #   home, chat/[id], settings/profile
├── components/
│   ├── calls/                #   call-manager, incoming-call-modal, active-call-screen
│   ├── chat/                 #   panel, lista, burbuja, input, voz, gifs, stickers, emoji, acciones
│   ├── sidebar/              #   lista de conversaciones
│   ├── providers/            #   socket provider/connector
│   └── ui/                   #   shadcn/ui (Base UI)
├── hooks/                    # use-socket, use-call, use-upload
├── lib/
│   ├── api.ts                #   cliente REST (cifrado transparente)
│   ├── socket.ts             #   cliente WS (cifrado transparente)
│   ├── crypto/qcipher.ts     #   algoritmo de cifrado (espejo del backend)
│   └── zod-config.ts         #   Zod jitless (compatible con CSP)
├── stores/                   # Zustand: auth, chat, call
└── proxy.ts                  # CSP por request (nonce)
```
