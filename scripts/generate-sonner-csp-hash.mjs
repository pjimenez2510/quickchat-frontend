// Genera el hash CSP del <style> que `sonner` inyecta en runtime.
//
// Sonner crea un <style> vía createElement('style') + __insertCSS("<css>") y NO
// soporta nonce. Para poder usar `style-src 'self' 'nonce-...'` (sin
// 'unsafe-inline') sin romper los toasts, añadimos el hash sha256 de ese CSS a
// la directiva. El navegador permite un <style> cuyo contenido coincide con un
// 'sha256-...' declarado.
//
// El hash se recalcula en cada build (prebuild/predev), así que sobrevive a las
// actualizaciones de sonner: si el CSS cambia, el hash se regenera solo.
//
// Salida: src/lib/sonner-csp-hash.ts

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SONNER_ENTRY = join(ROOT, 'node_modules/sonner/dist/index.mjs');
const OUT_FILE = join(ROOT, 'src/lib/sonner-csp-hash.ts');

/**
 * Extrae el string literal pasado a __insertCSS("...") respetando escapes y
 * paréntesis dentro del CSS, y lo evalúa a su valor real en runtime.
 */
function extractInjectedCss(source) {
  const marker = '__insertCSS(';
  let from = 0;
  while (true) {
    const callIdx = source.indexOf(marker, from);
    if (callIdx === -1) break;
    let i = callIdx + marker.length;
    while (i < source.length && /\s/.test(source[i])) i++;
    const quote = source[i];
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      // No es la llamada con string literal (p.ej. la definición con `code`).
      from = callIdx + marker.length;
      continue;
    }
    // Recorre el literal respetando escapes hasta la comilla de cierre.
    let j = i + 1;
    while (j < source.length) {
      if (source[j] === '\\') {
        j += 2;
        continue;
      }
      if (source[j] === quote) break;
      j++;
    }
    const literal = source.slice(i, j + 1);
    // Resuelve los escapes JS para obtener el texto exacto que ve el navegador.
    return new Function(`return ${literal}`)();
  }
  return null;
}

function main() {
  const source = readFileSync(SONNER_ENTRY, 'utf8');
  const css = extractInjectedCss(source);

  if (!css) {
    throw new Error(
      '[sonner-csp-hash] No se pudo extraer el CSS de __insertCSS() en sonner. ' +
        'Revisa node_modules/sonner/dist/index.mjs — pudo cambiar el formato.',
    );
  }

  const digest = createHash('sha256').update(css, 'utf8').digest('base64');
  const hash = `sha256-${digest}`;

  const banner =
    '// GENERADO AUTOMÁTICAMENTE por scripts/generate-sonner-csp-hash.mjs\n' +
    '// NO editar a mano. Se regenera en cada prebuild/predev.\n' +
    '// Hash del <style> que sonner inyecta en runtime, para la CSP (style-src).\n';

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(
    OUT_FILE,
    `${banner}export const SONNER_STYLE_HASH = '${hash}';\n`,
    'utf8',
  );

  console.log(`[sonner-csp-hash] ${hash} (${css.length} bytes) → ${OUT_FILE}`);
}

main();
