# GAIO desde GitHub Actions

Automatización manual de acceso y asistencia con Playwright.

## Estado actual

Se verificó en un navegador cloud el recorrido real: GAIO → Microsoft → SSO de Movate/CSS Corp → formulario de asistencia. El formulario vuelve a solicitar correo y contraseña y ofrece Check IN / Check Out. No se pulsó ninguno de esos botones.

La prueba `inspect` está preparada. Las marcaciones siguen bloqueadas (`verified: false`) hasta identificar el mensaje o indicador real de éxito de cada acción. Todavía no se ha probado con credenciales en GitHub Actions ni se han configurado horarios.

## Siguiente paso: dos secretos

En este repositorio abre **Settings → Secrets and variables → Actions → New repository secret** y crea:

| Nombre | Valor |
|---|---|
| `GAIO_EMAIL` | Tu correo empresarial |
| `GAIO_PASSWORD` | Tu contraseña empresarial |

Introduce los valores únicamente en los campos de secretos de GitHub. No los publiques como archivos, variables normales, issues o mensajes de chat. La sesión usada para inspeccionar el sitio en ChatGPT no se transfiere a GitHub.

## Probar sin marcar

Abre **Actions → GAIO → Run workflow**, elige `inspect` y deja la confirmación desmarcada.

La prueba inicia sesión a través de las pantallas observadas y comprueba que aparezcan los dos campos y ambos botones. No envía el formulario de asistencia. `ACCESS_CONFIRMED` significa que llegó al formulario, no que haya registrado una entrada o salida ni que haya validado la contraseña contra el formulario final.

Si Microsoft introduce MFA, consentimiento, selección de cuenta u otra pantalla nueva, la ejecución se detiene. No acepta esos pasos automáticamente. Un login fallido no se reintenta.

## Completar la verificación de marcaciones

Los identificadores del formulario ya están comprobados: `#txtEmpID`, `#txtpassword`, `#btncheckIn`, `#btncheckOut`.

Falta observar qué aparece después de una marcación normal. Configura en `gaio.config.json` el `successSelector` específico de cada acción, que debe estar oculto antes y visible después. No uses una fecha o registro antiguo. Si el resultado es un diálogo JavaScript, habrá que adaptar el verificador. Solo entonces cambia `verified` a `true`.

Después, para una marcación manual desde el teléfono o la computadora: **Actions → GAIO → Run workflow → check-in/check-out** y marca la confirmación. El proceso se ejecuta en GitHub.

No hay reintentos automáticos. Si falla después del clic, comprueba GAIO antes de repetir: el servidor puede haber recibido la marcación. La comprobación visual reduce duplicados, pero no garantiza idempotencia entre ejecuciones.

## Credenciales y límites

- No se imprimen credenciales, respuestas completas de la página, capturas ni trazas en los logs.
- `GAIO_SESSION` es opcional para una sesión previamente exportada; no hace falta para intentar el acceso mediante los dos secretos.
- `npm run login` sigue disponible como utilidad local opcional. Los archivos `.auth/` quedan excluidos de git.
- La conexión desde GitHub tendrá la IP del runner; las políticas corporativas pueden tratarla de forma diferente.
- Los permisos de escritura al repositorio permiten cambiar código que recibe secretos. Limita esos permisos.
- Faltan acordar días y horas si se desea una programación futura.

## Desarrollo

Node.js 24: `npm ci`, `npx playwright install chromium`, `npm test`. Las pruebas locales verifican las protecciones del código; no certifican acceso desde GitHub ni el resultado real de asistencia.

Referencias: [Playwright authentication](https://playwright.dev/docs/auth), [GitHub Actions manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-running-a-workflow).
