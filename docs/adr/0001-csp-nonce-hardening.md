# ADR 0001 — Endurecimiento de la Content Security Policy (nonce + hash)

- **Estado:** Aceptado
- **Fecha:** 2026-05-28
- **Contexto del escaneo:** OWASP ZAP 2.17 (reporte 2026-05-27)

## Contexto

El escaneo de OWASP ZAP sobre el frontend (`http://localhost:3000`) levantó tres
alertas, todas derivadas de la cabecera `Content-Security-Policy`:

| Alerta | Riesgo |
|--------|--------|
| CSP: `script-src` incluye `'unsafe-inline'` | Medium |
| CSP: `style-src` incluye `'unsafe-inline'` | Medium |
| CSP: host duplicado en `connect-src` (`ws://...`) | Low |

El requisito del cliente es un reporte **sin alertas** (ni Medium ni Low). La CSP
original era estática (definida en `next.config.ts`) y usaba `'unsafe-inline'`
tanto para scripts como para estilos, lo que ZAP marca porque anula buena parte
de la protección contra XSS.

## Alternativas evaluadas

1. **Mantener `'unsafe-inline'` y documentar riesgo aceptado.** Descartada: no
   cumple el requisito de cero alertas.
2. **Subresource Integrity (SRI)** (`experimental.sri`, disponible en Next 16.2 con
   Turbopack). Verificado empíricamente: SRI firma los chunks externos pero deja
   sin firmar los scripts **inline** de hydration (`self.__next_f.push(...)`), por
   lo que con `script-src 'self'` la app no hidrata. **No elimina** la necesidad de
   `'unsafe-inline'` en el App Router. Sirve como defensa anti-tampering, no como
   sustituto.
3. **Nonce por request + `strict-dynamic`** para `script-src`. Es la única vía que
   permite eliminar `'unsafe-inline'` de scripts en el App Router: Next.js detecta
   el nonce en la CSP de la request y lo aplica a todos sus `<script>`, incluidos
   los inline de hydration. **Elegida.**

Para `style-src`:

- Los nonces **no** aplican a atributos `style="..."` (solo a bloques `<style>`).
  Se refactorizaron los estilos inline estáticos a clases Tailwind.
- `sonner` inyecta un `<style>` en runtime y **no soporta nonce**. Como su CSS es
  constante, se calcula su hash SHA-256 en build y se añade a `style-src`.
- Se añade también el hash del `<style>` vacío (estado transitorio de la inyección
  de `sonner`).
- Zod v4 ejecuta una sonda `Function("")` (JIT) que dispara una violación de
  `script-src eval`; se desactiva con `z.config({ jitless: true })`.

## Decisión

CSP **dinámica por request** generada en `src/proxy.ts`:

```
default-src 'self';
script-src 'self' 'nonce-<aleatorio>' 'strict-dynamic';
style-src  'self' 'nonce-<aleatorio>' 'sha256-<sonner>' 'sha256-<vacío>';
img-src 'self' data: blob: https://*.amazonaws.com https://*.giphy.com;
font-src 'self' data:;
connect-src 'self' <API_URL> <WS_URL(ws/wss)> https://api.giphy.com https://*.amazonaws.com;  # sin duplicados
media-src 'self' blob: https://*.amazonaws.com;
frame-ancestors 'none'; base-uri 'self'; form-action 'self';
object-src 'none'; upgrade-insecure-requests;
```

- En **desarrollo** se usa una CSP permisiva (`'unsafe-inline' 'unsafe-eval'`)
  porque el HMR/overlay de Turbopack inyecta scripts/estilos sin nonce; la CSP
  estricta (la que audita ZAP) aplica solo en **producción**.
- El hash de `sonner` se regenera en cada build mediante
  `scripts/generate-sonner-csp-hash.mjs` (`prebuild`/`predev`), por lo que
  sobrevive a las actualizaciones de la librería.

## Consecuencias

**Positivas**
- Reporte ZAP sin alertas Medium/Low de CSP.
- CSP robusta: sin `'unsafe-inline'` ni `'unsafe-eval'` en producción.
- 0 violaciones CSP en runtime (verificado con Chrome headless).

**Negativas / costes**
- El nonce obliga a **render dinámico** de todas las páginas: se pierde la
  generación estática, ISR y la cacheabilidad en CDN. Aceptable para una app de
  chat autenticada (mayormente dinámica).
- Restricción de estilo: prohibido `style="..."` en SSR (usar clases Tailwind);
  los estilos dinámicos deben aplicarse en cliente vía CSSOM.
- Dependencia frágil controlada: el hash de `sonner` se regenera en build para
  evitar romper en upgrades.

## Verificación

- `npm run build` correcto (todas las rutas `ƒ Dynamic`, Proxy registrado).
- Header inspeccionado con `curl`: sin `'unsafe-inline'`/`'unsafe-eval'`, sin
  hosts duplicados.
- Chrome headless (CDP, evento `securitypolicyviolation`): **0 violaciones** en
  `/`, `/login`, `/register`.
