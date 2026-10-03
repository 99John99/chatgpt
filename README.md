# GAIO automático

## Horario activo

De lunes a viernes, zona **America/Costa_Rica**:

| Acción | Hora |
|---|---|
| Check In | 08:00 |
| Check Out | 17:00 |

GitHub Actions ejecuta el flujo en la nube usando `GAIO_EMAIL` y `GAIO_PASSWORD` de los secretos del repositorio. Las ejecuciones programadas no requieren confirmación. El horario está definido en `.github/workflows/gaio.yml`; los horarios descriptivos y las exclusiones están en `schedule.json`.

## Qué hace

1. Comprueba si la fecha está habilitada.
2. Completa el acceso corporativo Microsoft/Movate si es necesario.
3. Introduce correo y contraseña en el formulario de asistencia.
4. Pulsa una sola vez el botón correspondiente.
5. Cierra la alerta con OK y termina.

Se admiten las alertas HTML de GAIO y alertas nativas del navegador. No hay reintentos automáticos. Un fallo técnico se registra como ejecución fallida. Una alerta cerrada se registra como `ALERT_ACKNOWLEDGED`; esto indica que se ejecutó el flujo, no certifica que GAIO haya aceptado la marcación. La alerta observada de entrada duplicada se registra como `ALREADY_CHECKED_IN`.

No se imprimen contraseñas, correo, contenido completo de alertas ni capturas en los logs. Los secretos no están en el código.

## Vacaciones, feriados y pausa

Cuando el usuario pida cambios, actualizar `schedule.json` en `main` antes de la siguiente ejecución:

- `excludedDates`: fechas ISO `YYYY-MM-DD` que deben omitirse en ambas marcaciones.
- `excludedRanges`: periodos con `from` y `to` en formato ISO, ambos inclusive.
- `enabled: false`: pausa todas las marcaciones.

No se excluyen feriados automáticamente: solo las fechas que indique el usuario. Las exclusiones también se respetan en ejecuciones manuales. No incluir motivos personales en el archivo. Para cambiar las horas, actualizar ambos cron del workflow, la función `scheduledAction` y los horarios descriptivos de `schedule.json`.

Ejemplo de un periodo (solo ilustrativo, no configurado):

```json
{"from":"2027-01-04","to":"2027-01-08"}
```

## Comprobación y ejecución manual

Actions → GAIO → Run workflow → `inspect` comprueba acceso sin marcar asistencia. Para ejecutar una marcación manual, seleccionar la acción y marcar la confirmación. La confirmación manual no aplica a los horarios programados.

Los push y pull requests solo ejecutan pruebas sin credenciales. No realizan marcaciones. Las repeticiones manuales de una ejecución programada se omiten para evitar repetirla accidentalmente.

## Verificado y límites

- El acceso desde GitHub al formulario se comprobó con éxito en la ejecución 37089473371.
- Se observó en el navegador el aviso `You have already checked IN for today!` y su botón OK.
- Las pruebas locales cubren calendario, exclusiones, alertas y ausencia de reintentos. No se ha confirmado una nueva marcación exitosa de extremo a extremo.
- GitHub puede retrasar o, en alta carga, perder ejecuciones programadas; no garantiza puntualidad exacta.
- Al ser público este repositorio, GitHub puede desactivar la programación tras 60 días sin actividad del repositorio; revisar/re-habilitarla si ocurre. Los runs por sí solos no deben asumirse como actividad que evite esta regla.
- Una nueva pantalla corporativa, MFA o un cambio de contraseña puede requerir actualización.

Documentación: [GitHub schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [Playwright dialogs](https://playwright.dev/docs/dialogs).
