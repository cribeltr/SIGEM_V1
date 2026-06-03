# Qué captura el sistema — Eventos, formularios y campos

Gestión Equipos Críticos HHHA · referencia completa de los datos que el programa
**registra** (capturados por el usuario) y los que **deriva** (calculados solos).
Refleja los formularios reales de la aplicación.

> Convención: cada formulario es un panel lateral ("drawer"). Los campos marcados
> *(opcional)* pueden quedar vacíos; el resto se pide para que el dato sea útil.
> "Oficial / Borrador" indica si el registro ya está validado o aún es provisional.

---

## 0. Quiénes registran — Ejecutores / técnicos

Los campos **Ejecutor**, **Ejecutor 2** y **Responsable** se eligen de esta lista
configurable (los técnicos del equipo + servicio externo):

1. Carlos Bahamondes Seguel
2. Cristián Beltrán Oviedo
3. Cristina Rozas Urrutia
4. Daniel Díaz Neira
5. Ignacio Berner Bergara
6. Macarena Toledo
7. Marco Ulloa
8. Matías Soazo Garrido
9. Ricardo Matus Aroca
10. Tito Millapán Riquelme
11. **Personal externo** (empresa/servicio técnico externo)

> En **Visita técnica**, **Orden de Compra** y **Envío** además se captura el campo
> libre **Empresa** y, en la visita, el **Técnico** (texto libre) de la empresa externa.

---

## 1. Eventos de mantención (formulario "Nuevo evento")

Todo evento se asocia a un **N° Inventario** y queda en la **Bitácora**. Hay
**7 tipos**; cada uno captura campos propios además de los comunes.

**Campos comunes:** `N° Inventario` · `Fecha` · `Ejecutor` · `Observación / Informe` ·
`Oficial` (Borrador / Oficial).

| Tipo de evento | Efecto en el equipo | Campos que captura |
|---|---|---|
| **Solicitud de trabajo** | Abre ciclo correctivo · deja **no operativo** | Fecha · Ejecutor · N° Informe/Folio *(opcional)* · Oficial · **Descripción de la falla** |
| **Visita técnica** | Según estado elegido | Fecha · **Empresa** · **Técnico** · **Tipo visita** (diagnóstica / correctiva) · N° Informe/Folio · **Estado resultante** (no operativo / operativo / en servicio técnico) · Informe · Oficial |
| **Orden de Compra** | Gestión dentro del ciclo | Fecha · **N° Cotización** · **N° OC** · **Empresa** · **Vía** (trato directo / compra ágil) · Folio informe (solo trato directo) · N° Informe/Folio · Oficial · Observación |
| **Envío a servicio técnico** | Deja **en servicio técnico** | Fecha · **Empresa ST** · **N° Envío** · Ejecutor · N° Informe/Folio · Oficial · Observación |
| **Recepción** | Si "operativo" → **cierra el ciclo** | Fecha · **N° envío original** (se precarga del envío) · **Folio guía de despacho** · N° Informe/Folio · **Estado** (operativo / no operativo / en servicio técnico) · Observación · Oficial |
| **Reparación** | Cierre típico del ciclo (si "operativo") | Fecha · N° Informe/Folio · **Estado** · **Repuestos** · Descripción · Oficial |
| **Mantención preventiva** | Según resultado (ver §2) | Fecha · **Resultado** · Estado (si resultado = "Si") · Ejecutor · **Ejecutor 2** · Observación · Oficial |

### 1.1. Glosario completo de campos de un evento

Cada evento guarda (según el tipo) los siguientes campos:

| Campo | Significado |
|---|---|
| `N° Inventario` | Equipo al que pertenece el evento (clave de unión). |
| `Tipo` | Uno de los 7 tipos de la tabla anterior. |
| `Fecha` | Fecha del evento (la del hecho). |
| `Fecha de registro` | Cuándo se ingresó (se guarda automático). |
| `Ejecutor` / `Ejecutor 2` | Responsable(s); en MP admite dos. |
| `Resultado` | Solo MP: `Si`/`C1`–`C8`/`FS`/`NU`/`Baja`/`No`. |
| `Estado` | Estado del equipo que declara el evento. |
| `Empresa` | Empresa / servicio técnico externo. |
| `Técnico` | Nombre del técnico externo (visita). |
| `Tipo visita` | Diagnóstica o correctiva. |
| `Vía` | Orden de compra: trato directo / compra ágil. |
| `N° Informe / Folio` | Folio del informe o de la solicitud; vincula al ciclo. |
| `N° Envío` | N° de envío a servicio técnico (y su "envío original" en la recepción). |
| `N° OC` | N° de orden de compra. |
| `N° Cotización` | N° de cotización. |
| `Folio informe (TD)` | Folio del informe de trato directo. |
| `Folio guía de despacho` | Guía de despacho del retorno (recepción). |
| `Repuestos` | Repuestos usados (reparación). |
| `Observación / Informe` | Texto libre / informe del evento. |
| `Oficial` | Sí (validado) / No (borrador). |
| `Anulado` + `Motivo de anulación` | Si se anuló y por qué (ver §10). |
| `Adjuntos` | Archivos en Drive (ver §7). |
| `Marca de tiempo` | Momento exacto de creación (orden cronológico). |

---

## 2. Mantención preventiva — "MP rápida" (formulario abreviado)

Registra o **edita** la MP de un mes (si ya existe una, la corrige; no duplica).

- **Fecha** de la MP · **Resultado** · **Estado resultante** (lo eliges si el
  resultado es "Si"; si es una causal, se fija automático) · **Ejecutor** ·
  **Observación** *(opcional)*.

**Resultados y su efecto en el estado del equipo:**

| Código | Significado | Efecto en el estado | ¿Reprograma a 30 días? |
|---|---|---|---|
| `Si` | MP realizada | Operativo / No operativo (lo eliges) | — |
| `C1` | Imposibilidad de desocupar el equipo del paciente | Reprograma (no cambia estado) | **Sí** |
| `C2` | Equipo en servicio técnico | **En servicio técnico** | No |
| `C3` | No operativo, espera de repuestos/accesorios | **No operativo** | No |
| `C4` | Equipo en préstamo a otro hospital | Reprograma | No |
| `C5` | No disponibilidad de HH funcionario SEC (carga laboral) | Reprograma | **Sí** |
| `C6` | No disponibilidad de HH servicio técnico externo | Reprograma | **Sí** |
| `C7` | Ausencia funcionario SEC > 15 días | Reprograma | **Sí** |
| `C8` | Contingencia hospitalaria | Reprograma | **Sí** |
| `FS` | Fuera de servicio | **No operativo** | — |
| `NU` | No ubicado | **No operativo** (+ pendiente "Localizar equipo") | — |
| `Baja` | Dado de baja | **Baja** | — |
| `No` | No realizada | No cambia estado | — |

Las causales que reprograman generan un **pendiente de reprogramación** automático y
marcan la MP en el mes siguiente.

---

## 3. Ciclos correctivos (se crean solos, no hay formulario propio)

Una **Solicitud de trabajo** abre un **ciclo**; los eventos siguientes (Visita, OC,
Envío, Recepción, Reparación) avanzan ese ciclo hasta que se cierra. Cada ciclo guarda:

`N° Informe / Folio` · `N° Inventario` · `Fecha de apertura` · `Fecha de cierre` ·
`Estado` (abierto / cerrado / anulado) · `Ingeniero asignado` · `Motivo de cierre`
(cuando se cierra manualmente).

---

## 4. Pendientes y tareas (formularios "Nuevo pendiente" / detalle)

- **N° Inventario** · **Tipo** · **Descripción** · **Responsable (Ejecutor)** ·
  **Compromiso** (fecha) · **Recordatorio** (fecha) · **Estado**
  (No iniciado → En proceso → Resuelto).
- **Tareas atómicas**: lista de verificación (texto + hecha/pendiente). Al cerrar
  todas, ofrece cerrar el pendiente.
- **Seguimientos**: notas con **autor**, **fecha** y **texto** (historial de gestión).

**Tipos de pendiente:** Documento faltante · Firma faltante · Reprogramación MP ·
Recomendación técnica · Pauta de Monitoreo Diario · Gestión general ·
Seguimiento de estado.

---

## 5. Gestión de seguimiento (formulario "Registrar gestión")

Para equipos caídos: deja constancia de la gestión y fija el próximo recordatorio.

- **Contacté a** (ejecutor / responsable) · **Estado reportado** (Sigue no operativo ·
  En servicio técnico · En reparación · Esperando repuesto/OC · Listo para retiro ·
  Operativo resuelto · Sin novedad) · **Nota** · **Próximo recordatorio** (por defecto +7 días).

---

## 6. Baja de equipo (formulario "Dar de baja")

- **Motivo** (requerido). Efecto: el equipo pasa a **baja**, se marca la matriz y se
  cierran sus pendientes activos. Al **anular** la baja se reabren los ciclos que cerró.

---

## 7. Inventario del equipo (datos maestros, notas y archivos)

Cada equipo guarda: `ID_EQUIPO` · `N° Carpeta` · `N° Inventario` · `Equipo` ·
`Servicio` · `Unidad` · `Ubicación` · `Procedencia` · `Marca` · `Modelo` · `Serie` ·
`Año de instalación` · `Vida útil residual` · `Clasificación` · `Situación`
(En uso / Baja) · `Frecuencia MP` · `Encargado` · **programación anual** (código por
mes) · **registro** (Programado/Resultado por mes).

- **Notas del equipo**: `autor` · `fecha` · `texto` (con marca de tiempo).
- **Adjuntos** (Google Drive, solo en la versión Apps Script): `nombre` · `enlace` ·
  `fecha` · `tamaño`. Se pueden adjuntar a un equipo o a un evento.
- **Asignaciones MP**: por **mes** (AAAA-MM) y equipo, el **responsable** de hacer la
  MP de ese mes (alimenta "MP del mes" y los indicadores de cumplimiento).

## 8. Contactos del servicio

`Servicio` · `Cargo` (Supervisor de Servicio Clínico / Encargado de Equipos /
Jefe del CCRR) · `Nombre` · `Apellido` · `Anexo` · `Correo electrónico`.

---

## 9. Documentos esperados (para oficializar)

Para marcar un evento como **Oficial**, el sistema lista los documentos que deberían
respaldarlo (checklist de referencia):

- **Correctivo**: Solicitud SIGEM con tarea cerrada · Cotización · Informe técnico de
  trato directo · Orden de compra · Guía de despacho de repuestos · Informe de visita
  diagnóstica · Informe de visita correctiva · Hoja de envío · Informe técnico ST
  externo · Guía de despacho de retorno.
- **Preventivo**: Protocolo / hoja de MP · Pauta de monitoreo diario (DEA) · Firma del
  jefe de equipo médico · Informe técnico de empresa externa.

---

## 10. Campos que NO se capturan: se calculan solos

Para evitar errores, estos datos **no se escriben a mano**; el motor los deriva:

- **Estado del equipo** (operativo / no operativo / en servicio técnico / baja):
  se **recalcula** desde los eventos.
- **Días en estado** y **última gestión** (fecha + texto).
- **Atraso** de un pendiente (días desde el compromiso) y **antigüedad** de lo abierto.
- **Cumplimiento de MP** por equipo, servicio, responsable y mes.
- Metadatos de cada registro: **fecha de creación**, **marca de tiempo**, **anulado**
  y **motivo de anulación**: *Mal ingresado · Equipo equivocado · Fecha errónea ·
  Resultado equivocado · Duplicado · Ejecutor equivocado · Documentación faltante*.

---

## 11. Conciliación con el archivo maestro (Excel)

Al **importar el maestro** (`.xlsx/.xlsm`) el sistema lee las hojas **PMP**
(programación P) y **Registro_MP** (P y R) y compara contra lo que tiene. Captura/
detecta: **equipo nuevo**, **equipo faltante** y **diferencia de MP** (celda por
celda). Cada diferencia se resuelve eligiendo: *aceptar maestro · mantener programa ·
ingresar manual · posponer*.

---

## 12. Dónde se guarda lo capturado

- **En el navegador**: `localStorage` (comprimido). Es la copia de trabajo.
- **En Google Sheets** (si se conecta): un respaldo comprimido + hojas legibles que se
  **regeneran** en cada sincronización: Inventario · Pendientes · Tareas ·
  Tareas-Pendientes · Bitácora · Registro · Equipos en servicio técnico · Equipos no
  operativos · Asignaciones MP · Contactos.

---

## 13. Grabación de sesión (botón "Grabar", opcional)

Aparte de los datos de gestión, la app puede **grabar una sesión** para analizar el
uso. **No es obligatorio y no guarda datos clínicos ni el contenido de los campos.**
No se persiste en el estado ni en el Google Sheet: solo se exporta a un Excel al detener.

**Qué registra cada paso** (columna *Tipo*):

| Tipo | Qué captura |
|---|---|
| **Pantalla** | La vista que se abrió (Equipos, Pendientes, Ficha, etc.). |
| **Clic** | La *etiqueta* del botón/elemento (texto visible), no el dato. |
| **Formulario** | El *título* del formulario que se abrió (p. ej. "MP rápida"). |
| **Campo** | Solo la **etiqueta** del campo que se completó (p. ej. "Ejecutor"), **nunca el valor**. |
| **Búsqueda** | El texto buscado en la búsqueda global (⌘K). |
| **Resultado** | Avisos de éxito/confirmación que mostró la app. |
| **Error** | Errores de ejecución (para detectarlos). |
| **Inicio / Fin** | Marca de inicio y término de la grabación. |

**Excel que exporta al detener** — dos hojas:

- **Resumen**: duración · conteos (clics, formularios, campos, búsquedas, acciones,
  errores) · **tiempo por pantalla** · **pausas más largas** (dónde te detuviste) ·
  lista de acciones, formularios y búsquedas · pantallas visitadas · errores.
- **Pasos**: cada evento con `#` · `Hora` · `Δ s` (segundos desde el paso anterior) ·
  `Tipo` · `Pantalla` · `N° Inv.` · `Categoría` · `Acción / detalle`, con autofiltro.

Sirve para medir cuánto toma cada flujo y detectar fricción, sin exponer datos.
