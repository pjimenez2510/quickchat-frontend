import { z } from 'zod';

// Desactiva el JIT de Zod v4 (compila validadores vía `Function(...)`). Bajo la
// CSP estricta de producción (script-src sin 'unsafe-eval'), ese codegen dispara
// una sonda `Function("")` que el navegador reporta como violación CSP. En modo
// `jitless`, Zod usa el intérprete: funcionalmente idéntico para validar forms,
// y no se ejecuta ningún eval. Importar este módulo (efecto de lado) antes de
// construir cualquier schema.
z.config({ jitless: true });
