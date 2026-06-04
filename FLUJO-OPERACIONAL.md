# Flujo operacional — Gestión Equipos Críticos HHHA

Cómo fluye el trabajo en la práctica: la rutina diaria, el ciclo de la mantención
preventiva (MP), el ciclo correctivo de un equipo caído, la gestión de pendientes,
la conciliación con el maestro y el cierre de mes. Cada flujo indica el **disparador**,
los **pasos**, lo que **hace el sistema solo** (🤖) y **dónde se ve** en la app.

> Regla de oro del sistema: el **estado del equipo no se escribe a mano**; se
> **recalcula** desde los eventos. Tú registras hechos (MP, solicitudes, reparaciones)
> y el programa deduce el estado, los días caído, el cumplimiento, etc.

---

## 0. Mapa general

```
                 ┌─────────────────── INVENTARIO (maestro) ───────────────────┐
                 │  programación anual de MP por equipo (qué mes toca cada MP) │
                 └───────────────┬─────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                          ▼
  RUTINA DIARIA            CICLO PREVENTIVO          CICLO CORRECTIVO
  (Equipos +               (MP del mes →             (falla → solicitud →
   Pendientes)              resultado/reprog.)        diagnóstico → reparación →
        │                        │                    recepción → cierre)
        └────────────┬───────────┴───────────┬────────────┘
                     ▼                        ▼
              PENDIENTES                  BITÁCORA
        (tareas de gestión)        (historial de eventos)
                     │                        │
                     └──────────┬─────────────┘
                                ▼
                    SINCRONIZACIÓN (Google Sheets) + REPORTES (cumplimiento)
```

---

## 1. Rutina diaria (punto de partida)

**Disparador:** abrir el programa (parte en **Equipos**).

1. Mirar el **Resumen del día** (franja superior de Equipos):
   - `Operativos %` · `Caídos` · `MP del mes pendientes` · `Sin gestión >30 d` ·
     `Pendientes vencidos` · `Sin responsable`.
2. **Atender lo urgente** (clic en un indicador → filtra/salta):
   - *Caídos* o *Sin gestión >30 d* → equipos que necesitan seguimiento.
   - *MP del mes pendientes* → las MP que faltan este mes.
   - *Pendientes vencidos / Sin responsable* → salta a **Pendientes**.
3. Entrar a un equipo (clic en la fila) → **Ficha** → el banner **"Siguiente paso"**
   dice qué hacer según su estado, y la cabecera tiene los botones rápidos
   (Nuevo evento · MP del mes · Registrar gestión · Cerrar ciclo · Pendiente · Baja).

**Dónde se ve:** Equipos (resumen + tabla), Pendientes, Ficha.

---

## 2. Ciclo de Mantención Preventiva (MP)

### 2.1. Programación (una vez al año / al importar el maestro)
- El **maestro Excel** define qué **mes** toca la MP de cada equipo (programación P).
- Se **asigna un responsable por mes** a cada equipo (quién la ejecuta).
- 🤖 Al importar, el sistema completa lo vacío y deja todo listo para ejecutar.

**Dónde se ve:** Ficha → pestaña **Mantención** (matriz P/R/Responsable) · vista **MP del mes**.

### 2.2. Ejecución y registro (mensual)
**Disparador:** se realiza (o no) la MP del mes.

1. Abrir el equipo → botón **"MP del mes"** (o la pestaña Mantención → clic en la celda del mes).
2. Elegir **Resultado** y **Ejecutor**; agregar observación si corresponde.
3. Guardar. 🤖 El sistema:
   - Nace como **borrador** y **fija el responsable** de ese mes.
   - **Recalcula el estado** del equipo según el resultado (ver tabla §2.3).
   - Si el mes no estaba programado, **avisa** antes de guardar.
   - **Antiduplicado**: si ya había una MP de ese mes, la **actualiza** (no crea otra).

### 2.3. Qué pasa según el resultado
```
Si        → operativo / no operativo (tú lo eliges) · listo
C2        → 🤖 el equipo pasa a EN SERVICIO TÉCNICO
C3/FS/NU  → 🤖 el equipo pasa a NO OPERATIVO  (NU además crea "Localizar equipo")
Baja      → 🤖 el equipo pasa a BAJA
C1,C4–C8  → 🤖 REPROGRAMACIÓN: crea un pendiente y marca la MP en el mes siguiente
No        → no realizada (no cambia estado)
```

### 2.4. Corrección y oficialización
- Si te equivocaste (p. ej. registraste C6 y era C3): abre la MP del mes y **corrígela**;
  🤖 el sistema revierte los efectos anteriores y aplica los nuevos sin duplicar.
- Cuando el registro está respaldado, márcalo **Oficial** (deja de ser borrador).

**Dónde se ve:** Ficha → Mantención · Equipos → "Por mes" · Cumplimiento (cuánto se cumplió).

---

## 3. Ciclo correctivo (equipo que falla)

Es el flujo de un equipo caído, etapa por etapa. Todo queda en la **Bitácora** y se
sigue como un **ciclo** (abierto hasta que el equipo vuelve a operar).

```
1. SOLICITUD DE TRABAJO ─🤖─► abre ciclo + equipo NO OPERATIVO
        │  (registra la falla + N° folio)
        ▼
2. VISITA TÉCNICA (diagnóstica/correctiva)   → empresa, técnico, informe
        ▼
3. ORDEN DE COMPRA (si requiere repuestos)   → cotización, OC, vía
        ▼
4. ENVÍO A SERVICIO TÉCNICO ─🤖─► EN SERVICIO TÉCNICO   → empresa ST, N° envío
        ▼
5. RECEPCIÓN (equipo retorna)                → N° envío original, guía despacho
        ▼
6. REPARACIÓN / RECEPCIÓN con estado "operativo" ─🤖─► CIERRA EL CICLO + OPERATIVO
```

- No todos los pasos aplican siempre (un equipo puede repararse sin envío externo).
- 🤖 **Cierre automático**: cualquier evento (Reparación, Recepción o Visita correctiva)
  que deje el equipo **operativo** cierra el ciclo. También se puede **cerrar manualmente**
  (con justificación) desde la pestaña Seguimiento.
- **Invariante**: nunca queda un ciclo abierto con el equipo operativo o de baja.

### 3.1. Seguimiento mientras está caído
**Disparador:** el equipo lleva días no operativo / en servicio técnico.

1. Botón **"Registrar gestión"** en la ficha → a quién contactaste, estado reportado,
   nota y **próximo recordatorio** (por defecto +7 días).
2. 🤖 El sistema lleva los **días en estado** y los **días sin gestión**; si pasa **30 días**
   sin avance lo marca como alerta (aparece en "Sin gestión >30 d" del Resumen del día).

**Dónde se ve:** Ficha → Seguimiento (ciclo + gestiones) y Bitácora · Equipos (caídos).

---

## 4. Flujo de pendientes (tareas de gestión)

```
ORIGEN ─► ASIGNAR responsable ─► GESTIONAR (seguimientos/tareas) ─► RECORDAR ─► RESOLVER
  │
  ├─ manual (botón "Pendiente"): documento faltante, firma, gestión general…
  └─ 🤖 automático: reprogramación de MP (C1–C8), "Localizar equipo" (NU), etc.
```

1. **Crear** (manual o automático): tipo, descripción, responsable, **compromiso** (fecha)
   y **recordatorio**.
2. **Gestionar**: agregar **seguimientos** (notas con autor/fecha) y **tareas** (checklist).
   🤖 Al cerrar todas las tareas, ofrece cerrar el pendiente.
3. **Priorizar** (vista Pendientes): orden por más atrasado primero; los **vencidos** se
   resaltan; el Resumen muestra *activos / vencidos / esta semana / sin responsable*.
4. **Regla de los 3 días** 🤖: un pendiente sin avance ≥3 días sube al tope con "Recuérdale a X".
5. **Escalamiento** 🤖: si pasa **14 días** sin avance, se puede escalar al **Jefe CCRR** por
   correo desde la vista Recordatorios.
6. **Resolver**: estado → *Resuelto* (queda con fecha de cierre; reabrir la limpia).

**Dónde se ve:** Pendientes (tabla + resumen) · Ficha → Seguimiento · Recordatorios.

---

## 5. Baja de equipo (y su reversa)

```
Dar de baja (motivo) ─🤖─► estado BAJA + marca la matriz + cierra ciclos abiertos + cierra pendientes
Anular la baja       ─🤖─► reabre los ciclos que esa baja había cerrado (si no quedó operativo)
```
Todo evento es **reversible**: al **anular** un evento, el motor revierte sus efectos
(estado, resultado del mes, ciclo y pendientes automáticos).

---

## 6. Conciliación con el maestro (periódica)

**Disparador:** llega una versión nueva del Excel maestro (PMP / Registro_MP).

1. **Importar maestro** (`.xlsx/.xlsm`).
2. 🤖 El sistema compara y detecta: **equipo nuevo**, **equipo faltante** y
   **diferencia de MP** (celda por celda). Auto-completa lo vacío y oficializa los
   borradores que coinciden.
3. **Resolver** cada diferencia (una a una o en lote): *aceptar maestro · mantener
   programa · ingresar manual · posponer*.

**Dónde se ve:** Configuración (importar) · vista de conflictos.

---

## 7. Cierre de mes y reportes

1. Revisar **Cumplimiento** (por servicio / responsable / mes): cuántas MP programadas
   se ejecutaron, atrasos, % operativo.
2. Cerrar/oficializar los borradores del mes; gestionar las MP atrasadas (Resumen del día
   → "MP del mes pendientes").
3. **Exportar** la vista que necesites a Excel (respeta los filtros aplicados) o
   sincronizar al Google Sheet para respaldo y lectura compartida.

**Dónde se ve:** Cumplimiento · Tiempos de resolución · Exportar (en cada vista).

---

## 8. Sincronización y respaldo (transversal)

- 🤖 Cada cambio se guarda en el **navegador** (localStorage) al instante.
- Si está conectado a **Google Sheets**, sincroniza un respaldo comprimido + regenera las
  hojas legibles (Inventario, Pendientes, Bitácora, Registro, etc.) para lectura y respaldo.
- Sin conexión, conviene **descargar un respaldo** periódicamente.

---

## Resumen de automatismos del sistema (🤖)

| Acción del usuario | El sistema hace solo |
|---|---|
| Registrar **Solicitud de trabajo** | Abre ciclo + deja no operativo |
| Registrar **Envío a servicio técnico** | Deja en servicio técnico |
| **Reparación/Recepción** con estado operativo | Cierra el ciclo + deja operativo |
| MP con resultado **C2 / C3 / FS / NU / Baja** | Cambia el estado del equipo |
| MP con causal **C1, C4–C8** | Crea pendiente de reprogramación + marca el mes siguiente |
| MP **NU** | Crea pendiente "Localizar equipo" |
| **Dar de baja** | Cierra ciclos y pendientes; marca la matriz |
| **Anular** un evento o una baja | Revierte efectos / reabre ciclos |
| Cerrar **todas las tareas** de un pendiente | Ofrece cerrar el pendiente |
| Pendiente sin avance **≥3 días** / **≥14 días** | Lo prioriza / permite escalar al Jefe CCRR |
| Cualquier registro | Recalcula estado, días en estado, última gestión y cumplimiento |
