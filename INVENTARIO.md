# Inventario funcional — Gestión Equipos Críticos HHHA

Panorama de lo que hace el programa hoy. La interfaz es un **panel de consulta**
(Resumen · Datos · Ficha) con un diseño oscuro y enfocado en *leer y entender* el
parque de equipos. El motor (`src/hhha-core.js`) concentra los datos y las reglas;
la interfaz (`ui/app.js`) los **presenta** (no edita ni sincroniza desde la UI).

## 0. Arquitectura y build
- **Fuente** → `src/seed-data.js` (semilla), `src/hhha-core.js` (motor, sin DOM),
  `ui/styles.css` (diseño del panel), `ui/app.js` (presentación) y
  `ui/vendor/chart.umd.js` (Chart.js 4.4.1, gráficos del Resumen, offline).
  `tools/build.js` inlina todo en `app.html` (navegador) y
  `apps-script/Index.html` (**idéntico**, para Apps Script).
- **Cómo se nutre el panel**: `ui/app.js` arranca el motor (semilla + estado en
  `localStorage`) y construye, desde el estado real, las mismas "hojas" del
  cuaderno (Inventario, Pendientes, Bitácora, Registro, etc.); el panel trabaja
  sobre esas hojas. Así los KPIs, gráficos, tablas y fichas reflejan el estado
  recalculado por el motor (no un volcado estático escrito a mano).
- **Backend**: `apps-script/Code.gs` sigue **sirviendo** el HTML como Web App. Su
  API de sincronización (apiSave/apiRead/Drive) queda disponible pero el panel
  actual, al ser de solo consulta, **no la usa**.
- **Persistencia**: `localStorage` (comprimido LZ). El panel no escribe cambios.

## 1. Modelo de datos (`state`)
- **equipos[]**: `inv` (clave), `id` (correlativo estable), `equipo, fam, servicio,
  unidad, ubic, proc, marca, modelo, serie, ano, vur, clasif, freq, carpeta`,
  `estado` (desconocido/operativo/no_operativo/en_servicio_tecnico/baja),
  `estadoDesde`, `subestado`, `encargado`, `notas[]`,
  `prog{mes→código}` (programación anual), `registro{mes→{P,R}}` (gantt P/R),
  `adjuntos[]` (Drive).
- **eventos[]**: `id, inv, tipo, fecha, fechaReg, resultado, ejecutor, ejecutor2,
  estado, obs, oficial(Sí/No), anulado, motivoAnulacion, folio, nEnvio, nOC, nCotiz,
  empresa, tecnico, tipoVisita, via, folioInformeTD, repuestos, origen, adjuntos[], ts`.
- **ciclos[]** (correctivos): `id, folio, inv, fechaApertura, fechaCierre, estado
  (abierto/cerrado/anulado), ingenieroAsignado, motivoCierre`.
- **pendientes[]**: `id, inv, tipo, desc, ejecutor, estado (no_iniciado/en_proceso/
  cerrado), fechaCrea, fechaComp, proxRecord, fechaCierre, seguimientos[], tareas[],
  eventoOrigen, origen, anulado`.
- **tareas[]**: `id, pendId, inv, desc, estado`.
- **asignacionesMP{ "AAAA-MM" → {inv→ejecutor} }**: responsable de la MP por mes.
- **conflictos[]**: diferencias con el maestro (ver §6).
- **importaciones[]**, **contactos[]** (servicio/cargo/nombre/apellido/anexo/correo),
  **actividad[]** (telemetría heredada, ya no se alimenta), **audit[]** (historial de
  cambios), **prefs{}**, **counters{}**.

## 2. Catálogos y reglas fijas
- **MESES** Ene–Dic. **EJECUTORES** (11). **TIPOS_EVENTO**: Solicitud de trabajo,
  Visita técnica, Orden de Compra, Envío a servicio técnico, Recepción, Reparación,
  Mantención preventiva.
- **CAUSALES C1–C8** (cada una con descripción y si exige reprogramar a 30 días).
- **RESULTADOS_MP**: Si, C1–C8, FS, NU, Baja, No.
- **TIPO_PENDIENTE**: Documento faltante, Firma faltante, Reprogramación MP,
  Recomendación técnica, Pauta de Monitoreo Diario, Gestión general, Seguimiento.
- **CARGOS_CONTACTO**: Supervisor de Servicio Clínico, Encargado de Equipos, Jefe CCRR.
- **DOCS** esperados por evento correctivo y preventivo (para checklist de oficialización).

## 3. Máquina de estados (reglas de negocio del equipo)
- **Estado del equipo = se RECALCULA** desde los eventos (`recalcEstadoEquipo`):
  1) si hay MP con resultado **Baja** → `baja`;
  2) si no, el último evento que declara estado manda;
  3) una MP manda por su **resultado**: `Si`→operativo/no_operativo (lo elige quien
     registra); causal vía `MP_CAUSAL_ESTADO`: **C2**→en servicio técnico,
     **C3/FS/NU**→no operativo, **Baja**→baja; **C1/C4–C8** = reprogramación (no
     cambia estado); **No** = no realizada (no cambia estado);
  4) sin eventos, se infiere de la matriz; por defecto operativo.
- **Días en estado** y **última gestión** (fecha + texto) derivados.
- **MP del mes**: `ejecutada` (Si) / `reprogramada` (C1–C8) / `otro` (FS/NU/Baja/No) /
  `pendiente`; clase `oficial|borrador|reprog|otro|noreg`.

## 4. Operaciones (capacidades del motor)
> El **motor** conserva todas estas operaciones de escritura; el **panel actual no
> las expone** (es de solo consulta). Se documentan porque siguen disponibles en
> `src/hhha-core.js` y son la base de los datos que el panel presenta.

**Mantención preventiva**
- `registrarMP` (MP rápida): valida ejecutor; avisa si el mes no estaba programado;
  nace **borrador**; aplica efectos; **fija el responsable del mes** = ejecutor.
- `corregirMP` (editar la MP del mes, p. ej. C6→C3): revierte efectos previos
  (R del mes, pendientes auto, marca R del mes siguiente), aplica los nuevos y
  recalcula; **no duplica**; fija responsable.
- **Antiduplicado**: registrar una MP sobre un mes que ya tiene una (incluido un
  borrador importado) **actualiza** esa, no crea otra.
- `registrarMPMasiva` (lote, con omisión de duplicados) · `consolidarMPDuplicadas`
  (deja una por equipo/mes) · `oficializarTodosBorradores`.
**Eventos / ciclos correctivos**
- `crearEvento` (Solicitud, Visita, OC, Envío, Recepción, Reparación, MP). Efectos
  (`aplicarEfectosEvento`): cambia estado; **Solicitud abre ciclo** y deja no operativo;
  **Reparación/Recepción/Visita correctiva con estado operativo cierra el ciclo**; MP
  causal C1–C8 genera **pendiente de reprogramación** (y marca "R" el mes siguiente);
  NU genera "Localizar equipo"; Baja pasa a baja.
- `oficializarEvento`, `editarEvento` (campos no críticos), **`anularEvento`** (motor
  de reversión: limpia R del mes, recalcula estado, anula/reabre ciclo y anula
  pendientes automáticos según corresponda).
**Pendientes**
- `crearPendiente`, `actualizarPendiente`, `cambiarEstadoPend`, `cerrarPendiente`
  (reabrir limpia `fechaCierre`), `anularPendiente`, `agregarSeguimiento`,
  `agregarTareaPendiente`/`toggleTarea` (al cerrar todas, ofrece cerrar el pendiente),
  `registrarGestionEquipo` (gestión + recordatorio).
- **Regla de los 3 días (UI)**: un pendiente sin avance ≥3 días sube al tope con
  "Recuérdale a X"; "Solicitar/Delegar/Resuelto" y recordatorio en lote por responsable.
**Equipo**
- `asignarEncargado`, `agregarNotaEquipo`, **`darDeBaja`** (evento Baja + marca el mes,
  limpia meses posteriores, **cierra ciclos abiertos** —etiquetados con la baja—, cierra
  pendientes). Al **anular** la baja, `anularEvento` **reabre** esos ciclos (si el equipo
  no quedó operativo ni en baja).
**Contactos del servicio**: alta/edición/baja, vinculados a un servicio (o generales).

## 5. Conciliación con el archivo maestro (Excel)
- `parsearMaestro` → hojas **PMP** (programación P) y **Registro_MP** (P y R).
- `compararMaestro`: detecta **equipo_nuevo**, **equipo_faltante** y **mp_diferencia**
  por celda; **auto-completa** lo vacío en el programa; si una R coincide con el
  maestro **oficializa** el borrador; si una R nueva del maestro no tiene evento, crea
  un **evento sintético**.
- `resolverConflicto` (por conflicto o en lote): **aceptar_maestro / manual** (escribe
  el valor; en R reemplaza —anula— los eventos que difieren y oficializa/crea el que
  coincide), **mantener_programa** (conserva la app y oficializa si coincide),
  **posponer**. equipo_nuevo→alta, equipo_faltante→baja.

## 6. Vistas (panel de consulta)
Cabecera fija: marca, navegación en "píldora" (3 vistas) y total de equipos.
Diseño oscuro, acento cian, tipografía Spline Sans (respaldo `system-ui`).

- **Resumen** (portada): 6 **KPIs** (equipos totales, operativos, no operativos, en
  servicio técnico, vida útil vencida + críticos ≤2 años, pendientes abiertos), dos
  **gráficos Chart.js** (dona "estado del parque" y barras "resultado de mantenciones"
  de la bitácora) y dos **tablas de alerta** (equipos *no operativos* y *en servicio
  técnico*, ordenadas por días sin gestión; clic en una fila → ficha del equipo).
- **Datos**: navegador de **hojas** (Inventario, Pendientes, Tareas, Tareas-Pendientes,
  Bitácora, Registro, Equipos en servicio técnico, Equipos no operativos, Asignaciones
  MP, Contactos) con conteo por hoja, **buscador global**, **filtros por columna tipo
  Excel** (multiselección con conteos, orden A–Z/Z–A, filtros activos como chips),
  **paginación** (60 filas) y **exportar CSV** de lo filtrado. El N° de inventario es
  un enlace → ficha.
- **360 Ficha**: **buscador** por n° inventario, equipo, marca, modelo o servicio
  (con sugerencias y teclado ↑/↓/Enter) + accesos rápidos a equipos con más actividad.
  Abre una **ficha unificada**: cabecera con estado, grilla de datos del inventario
  (con realce de vida útil residual), **línea de tiempo de la bitácora** y lista de
  **pendientes**. Botón **Imprimir ficha** (hoja limpia para impresión).

## 7. Datos, exportación y despliegue
- **Fuente de datos del panel**: el estado del motor (semilla embebida + cambios en
  `localStorage`), transformado a las hojas del cuaderno. Es una **instantánea**: para
  reflejar datos nuevos se reconstruye el archivo (`node tools/build.js`) con una
  semilla actualizada. *(Posible mejora futura: leer en vivo desde el Sheet en el
  despliegue de Apps Script, manteniéndolo de solo lectura.)*
- **Exportar CSV** por hoja desde la vista **Datos** (respeta filtros y orden).
- **Despliegue**: abrir `app.html` directo en el navegador, o pegar
  `apps-script/Index.html` en un proyecto de Apps Script y publicarlo como Web App
  (`Code.gs` → `doGet` sirve `Index`). Funciona **offline** (todo va inline).

## 8. (Reservado)
- La grabación de sesión y la sincronización en vivo pertenecían a la interfaz
  operativa anterior. El motor conserva sus capacidades; el panel de consulta actual
  no las expone.

## 9. Invariantes garantizadas (verificadas en Fase 2)
1. `equipo.estado` siempre **== recalculado** desde sus eventos (determinista).
2. IDs de evento y de pendiente **únicos**.
3. **Ningún ciclo abierto** con el equipo operativo **ni en baja**.
4. MP con causal determinista (C2/C3/FS/NU/Baja) ⇒ `estado` coherente.
5. Pendiente **cerrado** ⇒ tiene `fechaCierre`; **reabierto** ⇒ se limpia.
6. **Una sola MP vigente** por equipo y mes tras consolidar.
7. Anulación **revierte** todos los efectos (R, estado, ciclo, pendientes auto); anular
   una **baja** reabre los ciclos que esa baja cerró (salvo que el equipo quede operativo).
