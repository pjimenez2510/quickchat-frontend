# Cifrado de transporte (QCipher)

> **TL;DR.** QuickChat cifra el **payload completo** de cada petición/respuesta REST
> y de cada evento WebSocket con un cifrado simétrico propio (**QCipher**) y una
> **clave compartida** cliente↔servidor. Es una **capa de ofuscación en tránsito**,
> **NO** es cifrado de extremo a extremo (E2E): el servidor descifra con la misma
> clave y **guarda los mensajes en texto plano** en la base de datos.

## Qué se cifra

No se cifran "campos" concretos: se cifra el **mensaje JSON completo** a nivel de
transporte, de forma transparente.

| Canal | Qué se cifra | Dónde |
|-------|--------------|-------|
| **REST** | El `body` JSON entero de cada request (POST/PATCH/…) y el cuerpo entero de cada response del backend | `src/lib/api.ts` |
| **WebSocket** | Los argumentos de **todos** los eventos no reservados (`message:send`, `message:new`, etc.), incluido el valor de los *acks* | `src/lib/socket.ts` |

Lo que **no** se cifra:
- Eventos reservados de Socket.io (`connect`, `disconnect`, `ping`/`pong`, …).
- Peticiones `GET` (no llevan body).
- Cabeceras HTTP (incluido `Authorization: Bearer <jwt>`), la URL/el path, ni los
  metadatos de la conexión.
- Ficheros binarios subidos (multimedia va por su propio canal de upload).

## Formato del payload cifrado

Tanto REST como WS transportan este sobre (envelope):

```json
{ "v": 1, "iv": "<base64 de 8 bytes>", "ct": "<base64 del texto cifrado>" }
```

- `v`: versión del esquema (`1`).
- `iv`: vector de inicialización aleatorio de 8 bytes (uno nuevo por cada cifrado).
- `ct`: bytes cifrados (keystream XOR plaintext), en base64.

El receptor detecta el sobre con `isEncryptedPayload()` y descifra; si el contenido
no tiene esa forma, se pasa tal cual (compatibilidad/tolerancia).

## Cómo funciona el algoritmo

QCipher (`src/lib/crypto/qcipher.ts`) es un **cifrado de flujo (stream cipher)
didáctico**:

1. Deriva un estado inicial a partir de la **clave** (suma de bytes) y del **IV**.
2. Por cada byte del mensaje genera un byte de *keystream* combinando:
   - mezcla del estado con el byte de clave correspondiente y el índice,
   - rotaciones de bits (`rotl`),
   - una **caja de sustitución (S-box)** de 256 entradas generada determinísticamente,
   - operaciones aritméticas módulo 256.
3. Hace **XOR** del byte de mensaje con el byte de keystream.

Al ser XOR con keystream, **cifrar y descifrar es la misma operación** (con la
misma clave + IV). El IV aleatorio hace que dos mensajes idénticos produzcan
`ct` distintos.

## Flujo extremo a extremo (cliente ↔ servidor)

```
Cliente (browser)                         Backend (NestJS)
─────────────────                         ────────────────
qcipherEncrypt(JSON)  ──{v,iv,ct}── REST ─▶ DecryptRequestInterceptor → handler
                                            (lógica de negocio con datos en claro)
                                            EncryptResponseInterceptor
qcipherDecrypt(resp)  ◀──{v,iv,ct}── REST ─┘

socket.emit(evento)   ──{v,iv,ct}── WS ───▶ WsCryptoInterceptor → gateway
socket.on(evento)     ◀──{v,iv,ct}── WS ───┘ (re-cifra al emitir)
```

- Cliente: el wrapper de `api.ts` y el `patchSocket()` de `socket.ts` cifran/
  descifran de forma **transparente** (el resto del código trabaja con objetos en
  claro).
- Backend: lo aplican **interceptors globales**
  (`DecryptRequestInterceptor` + `EncryptResponseInterceptor` en REST,
  `WsCryptoInterceptor` en el gateway). El espejo del algoritmo está en
  `quickchat-backend/src/common/crypto/qcipher.ts` — **ambos archivos deben
  mantenerse sincronizados**.

## Gestión de la clave

- Frontend: `NEXT_PUBLIC_CRYPTO_TRANSPORT_KEY` (en `.env`).
- Backend: `CRYPTO_TRANSPORT_KEY`.
- **Deben coincidir EXACTAMENTE.** Si difieren, el descifrado falla
  (`Failed to decrypt server response`).
- Si no se define, se usa una clave por defecto (`quickchat-transport-default-…`)
  que **debe cambiarse en producción**.

## Propiedades de seguridad (léelo)

QCipher es **didáctico**, no de grado criptográfico. Hay que ser honestos sobre lo
que aporta y lo que **no**:

- ❌ **No es E2E.** El servidor tiene la clave, descifra y **almacena los mensajes
  en texto plano** (`content` en PostgreSQL). No protege frente a compromiso del
  servidor ni acceso de un administrador.
- ❌ **La clave es pública en la práctica.** Al ir en una variable `NEXT_PUBLIC_*`,
  queda embebida en el bundle JavaScript del navegador: cualquiera puede
  extraerla. Por tanto, frente a un atacante, esto es **ofuscación**, no
  confidencialidad real.
- ❌ **Sin autenticación/integridad.** No hay MAC ni AEAD: el texto cifrado es
  manipulable y no se detectan alteraciones.
- ❌ **Algoritmo no estándar ni auditado.** No usa AES-GCM/ChaCha20-Poly1305.
- ✅ La confidencialidad real en tránsito la da **HTTPS/WSS (TLS)**. QCipher es una
  capa extra de ofuscación de aplicación por encima de TLS.

### Recomendación
Para confidencialidad real:
1. Servir **siempre** sobre **HTTPS/WSS** (la CSP ya fuerza `upgrade-insecure-requests`).
2. Si se requiere confidencialidad frente al servidor, sustituir QCipher por
   **E2E real** (claves por usuario, p. ej. libsodium/`crypto_box`), lo que implica
   no poder almacenar `content` en claro.
3. Si solo se busca cifrado de transporte estándar, usar **AES-GCM** (Web Crypto
   API) con clave negociada por sesión, no embebida en el cliente.

## Referencias en el código

- `src/lib/crypto/qcipher.ts` — algoritmo (espejo del backend).
- `src/lib/api.ts` — cifrado/descifrado REST.
- `src/lib/socket.ts` — cifrado/descifrado WebSocket (`patchSocket`).
- Backend: `src/common/crypto/qcipher.ts`,
  `src/common/interceptors/{decrypt-request,encrypt-response,ws-crypto}.interceptor.ts`.
