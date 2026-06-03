# Qué captura el sistema — Eventos, formularios y campos

Gestión Equipos Críticos HHHA · descripción de los datos que el programa
**registra** (capturados por el usuario) y los que **deriva** (calculados solos).
Documento de referencia; refleja los formularios reales de la aplicación.

> Convención: cada formulario es un panel lateral ("drawer"). Los campos marcados
> *(opcional)* pueden quedar vacíos; el resto se pide para que el dato sea útil.

---

## 1. Eventos de mantención (formulario "Nuevo evento")

Todo evento se asocia a un **N° Inventario** y se guarda en la **Bitácora**. Hay
**7 tipos**; cada uno captura campos propios además de los comunes.

**Campos comunes a casi todos:** `N° Inventario` · `Fecha` · `Ejecutor` ·
`Observación / Informe` · `Oficial` (Borrador / Oficial).

| Tipo de evento | Efecto en el equipo | Campos que captura |
|---|---|---|
| **Solicitud de trabajo** | Abre ciclo correctivo · deja **no operativo** | Fecha · Ejecutor · N° Informe/Folio *(opcional)* · Oficial · **Descripción de la falla** |
| **Visita técnica** | Según estado elegido | Fecha · **Empresa** · **Técnico** · **Tipo visita** (diagnóstica / correctiva) · N° Informe/Folio · **Estado resultante** (no operativo / operativo / en servicio técnico) · Informe · Oficial |
| **Orden de Compra** | Gestión dentro del ciclo | Fecha · **N° Cotización** · **N° OC** · **Empresa** · **Vía** (trato directo / compra ágil) · Folio informe (solo trato directo) · N° Informe/Folio · Oficial · Observación |
| **Envío a servicio técnico** | Deja **en servicio técnico** | Fecha · **Empresa ST** · **N° Envío** · Ejecutor · N° Informe/Folio · Oficial · Observación |
| **Recepción** | Si "operativo" → **cierra el ciclo** | Fecha · **N° envío original** (se precarga del envío) · **Folio guía de despacho** · N° Informe/Folio · **Estado** (operativo / no operativo / en servicio técnico) · Observación · Oficial |
| **Reparación** | Cierre típico del ciclo (si "operativo") | Fecha · N° Informe/Folio · **Estado** · **Repuestos** · Descripción · Oficial |
| **Mantención preventiva** | Según resultado (ver §2) | Fecha · **Resultado** · Estado (si resultado = "Si") · Ejecutor · **Ejecutor 2** · Observación · Oficial |

El N° Informe/Folio, cuando hay un ciclo abierto, permite **vincular** el evento a
ese ciclo (se elige de la lista de ciclos abiertos).

---

## 2. Mantención preventiva — "MP rápida" (formulario abreviado)

Registra o **edita** la MP de un mes (si ya existe una, la corrige; no duplica).

- **Fecha** de la MP.
- **Resultado**: `Si` · `C1`–`C8` · `FS` · `NU` · `Baja` · `No`.
- **Estado resultante**: si el resultado es "Si" lo eliges (operativo / no operativo);
  si es una causal, se fija **automáticamente** (ver tabla de causales).
- **Ejecutor** (responsable de la MP).
- **Observación** *(opcional)*.

**Resultados y su efecto en el estado del equipo:**

| Código | Significado | Efecto en el estado |
|---|---|---|
| `Si` | MP realizada | Operativo / No operativo (lo eliges) |
| `C1` | Imposibilidad de desocupar el equipo del paciente | Reprograma (no cambia estado) |
| `C2` | Equipo en servicio técnico | **En servicio técnico** |
| `C3` | No operativo, espera de repuestos/accesorios | **No operativo** |
| `C4` | Equipo en préstamo a otro hospital | Reprograma |
| `C5` | No disponibilidad de HH funcionario SEC (carga laboral) | Reprograma |
| `C6` | No disponibilidad de HH servicio técnico externo | Reprograma |
| `C7` | Ausencia funcionario SEC > 15 días | Reprograma |
| `C8` | Contingencia hospitalaria | Reprograma |
| `FS` | Fuera de servicio | **No operativo** |
| `NU` | No ubicado | **No operativo** (+ pendiente "Localizar equipo") |
| `Baja` | Dado de baja | **Baja** |
| `No` | No realizada | No cambia estado |

Las causales C1, C4–C8 generan un **pendiente de reprogramación** automático.

---

## 3. Pendientes y tareas (formularios "Nuevo pendiente" / detalle)

- **N° Inventario** · **Tipo** · **Descripción** · **Responsable (Ejecutor)** ·
  **Compromiso** (fecha) · **Recordatorio** (fecha) · **Estado**
  (No iniciado → En proceso → Resuelto).
- **Tareas atómicas**: lista de verificación (texto + hecha/pendiente). Al cerrar
  todas, ofrece cerrar el pendiente.
- **Seguimientos**: notas con **autor** y **fecha** (historial de gestión).

**Tipos de pendiente:** Documento faltante · Firma faltante · Reprogramación MP ·
Recomendación técnica · Pauta de Monitoreo Diario · Gestión general ·
Seguimiento de estado.

---

## 4. Gestión de seguimiento (formulario "Registrar gestión")

Para equipos caídos: deja constancia de la gestión y fija el próximo recordatorio.

- **Contacté a** (ejecutor / responsable).
- **Estado reportado**: Sigue no operativo · En servicio técnico · En reparación ·
  Esperando repuesto/OC · Listo para retiro · Operativo (resuelto) · Sin novedad.
- **Nota** (detalle / respuesta del técnico).
- **Próximo recordatorio** (fecha; por defecto +7 días).

---

## 5. Baja de equipo (formulario "Dar de baja")

- **Motivo** (requerido). Efecto: el equipo pasa a **baja**, se marca la matriz y se
  cierran sus pendientes activos.

---

## 6. Inventario del equipo (datos maestros)

Cada equipo guarda: `ID_EQUIPO` · `N° Carpeta` · `N° Inventario` · `Equipo` ·
`Servicio` · `Unidad` · `Ubicación` · `Procedencia` · `Marca` · `Modelo` · `Serie` ·
`Año de instalación` · `Vida útil residual` · `Clasificación` · `Situación`
(En uso / Baja) · `Frecuencia MP` · `Encargado` · **programación anual** (código por
mes) · **registro** (Programado/Resultado por mes) · `Notas` · `Adjuntos` (Drive).

## 7. Contactos del servicio

`Servicio` · `Cargo` (Supervisor de Servicio Clínico / Encargado de Equipos /
Jefe del CCRR) · `Nombre` · `Apellido` · `Anexo` · `Correo electrónico`.

---

## 8. Campos que NO se capturan: se calculan solos

Para evitar errores, estos datos **no se escriben a mano**; el motor los deriva:

- **Estado del equipo** (operativo / no operativo / en servicio técnico / baja):
  se **recalcula** desde los eventos.
- **Días en estado** y **última gestión** (fecha + texto).
- **Atraso** de un pendiente (días desde el compromiso) y **antigüedad** de lo abierto.
- **Cumplimiento de MP** por equipo, servicio, responsable y mes.
- Metadatos de cada registro: **fecha de creación**, **marca de tiempo**, **anulado**
  y **motivo de anulación** (Mal ingresado, Equipo equivocado, Fecha errónea,
  Resultado equivocado, Duplicado, Ejecutor equivocado, Documentación faltante).

---

## 9. Grabación de sesión (botón "Grabar", opcional)

Aparte de los datos de gestión, la app puede **grabar una sesión** para analizar el
uso (no es obligatorio y **no guarda datos clínicos**). Mientras graba, registra:

- **Pantalla** abierta · **clic** (la *etiqueta* del botón) ·
- **Formulario** abierto (solo el *título*) ·
- **Campo** completado (solo la **etiqueta** del campo, **nunca el valor**) ·
- **Búsqueda** (el texto buscado) · **resultado/aviso** · **error** de ejecución.

Al detener, exporta un Excel (Resumen + Pasos con tiempos) para medir cuánto toma
cada flujo y detectar fricción. No se persiste en el estado ni en el Google Sheet.
