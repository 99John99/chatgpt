# GAIO: ejecución desde GitHub Actions

Base de Playwright para comprobar acceso y ejecutar Check In/Check Out bajo demanda desde la nube.

**Estado: preparación inicial. No está activa ni validada contra una cuenta de GAIO.** Faltan el inicio de sesión, los selectores reales de la interfaz y una prueba de acceso desde GitHub. No hay horarios programados.

## 1. Preparar la sesión (Windows / PowerShell)

Instala Node.js 24 LTS y descarga este repositorio. Abre PowerShell en la carpeta descargada:

```powershell
npm ci
npx playwright install chromium
npm run login
```

Completa el login empresarial y MFA en el navegador que se abre. Navega hasta asistencia sin pulsar los botones y vuelve a PowerShell para presionar Enter. Esto crea `.auth/session.txt` y un informe local `.auth/controls.json`.

No pongas contraseñas en código. **El archivo de sesión permite acceder a tu cuenta: no lo compartas en chats, commits ni issues.** Está excluido de git. El informe de controles también es privado y local. La compresión del archivo de sesión NO es cifrado.

## 2. Configurar la pantalla real

Edita `gaio.config.json` después de observar GAIO:

- `url`: URL de la sección de asistencia dentro de `https://gaio.movate.com`.
- `authenticatedSelector`: elemento único que solo aparece después de iniciar sesión.
- `buttonSelector`: selector exacto del botón de cada acción.
- `successSelector`: indicador que está oculto antes de esa acción y visible después; debe identificar el estado actual, no un registro antiguo.
- `verified`: pasa a `true` solo después de revisar esos selectores. No adivines nombres.

Los selectores vacíos bloquean la ejecución. Si hay iframes, formularios intermedios, confirmaciones, ubicación o diálogos, hace falta adaptar el código antes de usarlo.

## 3. Guardar el secreto de GitHub

Abre Settings → Secrets and variables → Actions → New repository secret. Nombre: `GAIO_SESSION`. Valor: el contenido de `.auth/session.txt`. Puedes copiarlo al portapapeles desde PowerShell:

```powershell
Get-Content -Raw .auth/session.txt | Set-Clipboard
```

Pégalo únicamente en el campo de secreto de GitHub. No lo subas como archivo al repositorio. Recomendado: utiliza un repositorio privado y limita quién puede editar workflows; alguien con acceso de escritura podría cambiar el código para leer secretos.

## 4. Probar desde la nube

Actions → GAIO → Run workflow → `inspect`. Esto no pulsa botones. `ACCESS_CONFIRMED` indica que se encontró el elemento autenticado configurado. Un login local exitoso no garantiza que Microsoft permita reutilizar la sesión desde un runner de GitHub.

Después de validar el flujo real, selecciona `check-in` o `check-out` y marca la confirmación. Puedes hacerlo desde el teléfono; el navegador corre en GitHub, sin necesitar tu PC encendida.

No se guardan capturas ni contenido de la página en los logs. La ejecución comprueba el resultado visible y no reintenta si falla. Ante `FAILED_OR_UNCONFIRMED`, revisa GAIO antes de repetir: el clic podría haber sido recibido. La comprobación de estado reduce duplicados, pero no proporciona idempotencia del servidor.

## Límites pendientes de validar

- Expiración de sesión: repite el login y reemplaza el secreto cuando haga falta. Este flujo no renueva el secreto automáticamente.
- MFA, VPN o dispositivo corporativo obligatorio pueden impedir el acceso desde GitHub.
- La IP de salida será la del runner de GitHub. No se falsifica ubicación ni dispositivo.
- Si GAIO usa IndexedDB o sessionStorage, se intenta conservarlos; debe comprobarse su portabilidad real.
- No se han establecido días ni horas. Esta versión se inicia manualmente.

Documentación: [Playwright authentication](https://playwright.dev/docs/auth), [GitHub manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-running-a-workflow).
