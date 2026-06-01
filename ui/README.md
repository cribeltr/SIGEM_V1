# SIGEM · UI nueva (densa "pro")

Interfaz **rediseñada desde cero** sobre el núcleo lógico `../src/hhha-core.js`.
No reutiliza nada del diseño del archivo original: se generó **a partir de la
lógica** (entidades, estados, operaciones) con una estética _power-user_ de alta
densidad (estilo Linear / consolas de datos), inicio en **cola de trabajo** y
**100% funcional** (crea/edita/anula y persiste en `localStorage`).

## Cómo abrir
Abre `ui/index.html` en el navegador (doble click o `file://`). No requiere
servidor ni conexión: SheetJS y LZString están **vendorizados** en `ui/vendor/`.

```
ui/
├── index.html          Shell + orden de carga
├── styles.css          Sistema de diseño (tokens, light/dark, densidad alta)
├── app.js              Capa de vistas: router, tablas, drawer, command palette
└── vendor/
    ├── lz-string.min.js   Compresión de persistencia (engine ENV.compressor)
    └── xlsx.full.min.js   SheetJS: conciliación + export Excel (offline)
```
Carga: `lz-string` → `../src/seed-data.js` → `../src/hhha-core.js` → `xlsx` → `app.js`.

## Principios de diseño
- **Densidad alta**: filas compactas, tipografía 12–13px, números/IDs en monoespaciada,
  tablas con header pegajoso y orden por columna.
- **Cola de trabajo primero**: el inicio muestra lo accionable (alertas de equipos
  caídos/ST, pendientes vencidos, **MP del mes** pendientes, conflictos).
- **Sin modales centrales**: las acciones abren un **drawer** lateral derecho.
- **Estados como color**: operativo·verde, no operativo·rojo, servicio técnico·ámbar,
  baja·gris, desconocido·slate. Consistente en pills, badges y matriz MP.
- **Teclado**: command palette central + atajos (abajo).
- **Tema** claro/oscuro con un toque (persistente).

## Atajos de teclado
| Tecla | Acción |
|---|---|
| `⌘K` / `Ctrl K` | Command palette (buscar equipos + acciones) |
| `/` | Abrir el buscador rápido |
| `j` / `k` | Mover selección en tablas (Equipos, Pendientes) |
| `Enter` | Abrir la fila seleccionada |
| `Esc` | Cerrar palette / drawer / popover |

## Vistas
- **Cola de trabajo** — alertas + MP del mes (con "MP masiva") + pendientes accionables.
- **Equipos** — tabla densa filtrable (estado/servicio/familia/búsqueda), selección
  múltiple → **registrar MP** en lote, columna "MP del mes".
- **Equipo (ficha)** — cabecera con estado + datos; pestañas **Resumen · Matriz MP ·
  Bitácora · Ciclos · Pendientes · Conflictos**. Acciones: MP rápida, nuevo evento,
  pendiente, dar de baja. La **Matriz MP** es editable por celda (click → registra MP).
- **Pendientes** — tabla por estado (activos/no iniciado/en proceso/resueltos), drawer
  con tareas atómicas y seguimientos.
- **Ciclos** — correctivos abiertos/cerrados/anulados.
- **Eventos** — bitácora global; oficializar / editar / anular (con reversión de efectos).
- **Asignaciones MP** — por mes: asignar responsable, descargar/subir plantilla `.xlsx`.
- **Conciliación** — importar maestro Excel, auto-completar y resolver diferencias
  (aceptar maestro / mantener / manual / posponer, individual y en lote).

## Conexión con la lógica
Toda operación llama a la API `HHHA.*` (no hay lógica de negocio en la UI). El motor
se conecta al entorno mediante adaptadores inyectables:

```js
HHHA.configure({
  ui:  { notify, confirm, prompt, onChange },  // toasts, diálogos, re-render
  env: { xlsx: window.XLSX }                   // storage/compressor se autodetectan
});
HHHA.setSeed(SEED);
HHHA.bootstrapDatos();
```
`UI.onChange` re-renderiza la vista actual tras cada `save()`, manteniendo la
interfaz sincronizada con el estado.

## Almacenamiento en Google Sheets (opcional)

SIGEM puede guardar los datos en un **Google Sheet** mediante un **Apps Script
Web App**, manteniendo además hojas de trabajo legibles para usar el archivo sin
la app.

**Instalar** (una vez):
1. Crea/abre un Google Sheet → menú **Extensiones → Apps Script**.
2. Pega el contenido de `apps-script/Code.gs`. (Opcional: define `SHARED_TOKEN`.)
3. **Implementar → Nueva implementación → Aplicación web**: ejecutar como *Yo*,
   acceso *Cualquiera*. Copia la URL que termina en `/exec`.
4. En SIGEM → **Configuración**: pega la URL (+ token si lo usaste), **Probar
   conexión**, activa *Sincronización automática* y **Guardar configuración**.

**Cómo funciona**:
- El estado completo se guarda **comprimido en una hoja oculta** `_SIGEM_DATA`
  (las hojas de sistema empiezan con `_` y se ocultan automáticamente).
- **Generar hojas de trabajo** escribe hojas legibles (Inicio/leyenda, Inventario,
  Plan anual MP, Hoja de ruta del mes, Pendientes, Bitácora) para trabajar con el
  archivo aunque no tengas la app.
- Con *Sincronización automática*: al abrir, **trae** los datos desde la hoja; al
  cambiar algo, **sube** (con un pequeño retardo). También hay botones manuales
  *Traer* / *Guardar ahora* / *Generar hojas* y respaldo JSON local.
- Nota CORS: si abres el `app.html` con `file://` y el navegador bloquea la
  llamada, hospeda el HTML (Drive, GitHub Pages o un servidor local).

## Gestión (no solo registro)

Funciones para gestionar, no solo registrar:

- **Tendencia mensual de cumplimiento MP**: mini-gráfico de barras (% MP por mes
  del año) en *Cumplimiento*; clic en un mes lo selecciona.
- **Indicadores por responsable** (en *Cumplimiento*, modo *Por responsable*):
  pendientes abiertos, vencidos, MP ejecutadas (mes/año), eventos del año y
  equipos a cargo; clic → pendientes del responsable. Exportable.
- **Notas / observaciones por equipo**: panel en la ficha (Resumen) para agregar
  notas libres con autor y fecha (historial), auditadas.
- **Filtro por rango de fechas** (Desde / Hasta) en **Bitácora** (+ Exportar) y en
  la pestaña **Auditoría** de la ficha.

- **Recordatorios automáticos al abrir**: al cargar la app avisa (toast con acceso
  directo) de *pendientes vencidos* y *recordatorios para hoy* (`proxRecord`).
- **Auditoría por equipo**: pestaña *Auditoría* en la ficha con el **historial de
  cambios** (equipo, eventos, pendientes, tareas y ciclos): fecha/hora, campo,
  antes → después y usuario.
- **Cumplimiento por servicio** (vista nueva en el menú): tabla por servicio con
  equipos, estado (op/no-op/ST), **% operativo**, **MP del mes (ej/prog)**,
  **% cumplimiento MP** con barra, **MP atrasadas** y pendientes, con fila TOTAL,
  selector de mes/año, clic al detalle y *Exportar*.

- **Encargado del equipo**: ahora se puede **asignar explícitamente** (en la ficha,
  botón *Encargado*, o **en lote** seleccionando equipos en la lista). El motor lo
  prioriza sobre el derivado (ciclo/último ejecutor).
- **Equipos sin programación MP**: filtro *"Sin prog. MP"* + indicador en el inicio.
- **Reprogramaciones (C1–C8)**: bandeja propia (inicio → *Reprogramaciones*, abre
  Pendientes filtrado por ese tipo).
- **Vencimientos**: columna **Atraso** (días) y **Recordatorio** en Pendientes,
  orden por compromiso (más atrasados primero) y filtro *"Recordatorio ≤ hoy"*
  (+ indicador *Recordatorios hoy* en el inicio).
- **Exportar vista filtrada** a Excel: botón *Exportar* en **Equipos** y
  **Pendientes** (y *Exportar selección* en Equipos) — saca a `.xlsx` lo que estás
  viendo (p. ej. los pendientes de un responsable).


- **Pendientes**: filtro por **responsable** (incluye **"Sin asignar"**), filtro
  **"Solo vencidos"**, panel **"Carga por responsable"** (cuántos pendientes lleva
  cada uno, clic para filtrar) y **acciones en lote** sobre la selección —
  *asignar/quitar responsable*, *marcar en proceso* y *resolver*.
- **Equipos**: filtro **"Sin encargado"** y la columna *Encargado* resalta los
  equipos sin responsable.
- **Eventos**: filtro por **ejecutor** (incluye "Sin ejecutor").
- **Asignaciones MP**: selección múltiple para **asignar ejecutor** en lote.
- **Inicio**: la tarjeta *Pendientes* muestra *vencidos* y *sin asignar*.

> El registro de MP **en lote** (botones "MP masiva"/"Registrar MP" por selección)
> fue retirado de la UI; la MP se registra de forma individual (botón **MP** en
> línea, celda de la Matriz MP o **Nuevo evento**).

## Información incorporada desde SIGEM v1.0

Verificado contra el build `index_69.html` (SIGEM v1.0). La lógica de negocio y el
SEED son idénticos a los de este núcleo; se incorporó la **información/visión que
faltaba** en la UI, sin cambiar el diseño:

- **Cola de trabajo**: métricas *Alertas >30 días*, *MP atrasadas* (meses previos),
  *Borradores* (sin oficializar) y *MP del mes como % cumplido* con barra de progreso
  (9 indicadores accionables en total).
- **Asignaciones MP**: columnas *Resultado* y *Estado MP*, selección múltiple con
  *Registrar MP masiva* y *Asignar ejecutor* en lote, y filtros *Pendientes/Ejecutadas*
  y *Sin asignar*.
- **Equipos**: columna *Pend.* (pendientes abiertos) y filtros enlazados desde el inicio
  (*Alerta >30 días*, *MP atrasadas*).
- **Ficha de equipo**: campos *Familia* y *Clasificación*, y aviso de estado
  ("hace N días · encargado", en rojo si >30 días).
- **Formulario de evento**: campos faltantes — OC (*Empresa, Vía, Folio informe TD*),
  Recepción (*N° envío original, Folio guía*), MP (*Ejecutor 2*), Envío (*Ejecutor*).
- **Exportar Excel** → "Cuaderno de operaciones" autónomo, pensado para usarse **sin
  la aplicación**:
  - **Inicio** — portada con instrucciones de uso y **leyenda de códigos** (estados,
    resultados de MP con la descripción de cada causal C1–C8, tipos de pendiente,
    códigos de programación).
  - **Tablero** — indicadores estáticos + **estado por servicio** (equipos, no
    operativos, % MP del mes, pendientes).
  - **Hoja de ruta MP · mes** — MP programadas del mes para **imprimir y registrar a
    mano**: columnas en blanco (✎) *Realizada · Fecha · Estado · Firma · Observación*.
  - **Plan anual MP** — carta gantt P/R por mes (encabezados de mes combinados).
  - **Inventario** — catálogo completo con estado, días en estado, pendientes y ciclo.
  - **Pendientes** — con columnas (✎) *Avance · Nuevo estado · Fecha* para seguimiento offline.
  - **Ciclos correctivos** y **Bitácora** (historial; marca Manual/Automático).
  - Todas las tablas con **autofiltro** y títulos combinados.

## Notas
- Mismo `STORAGE_KEY` que el núcleo (`hhha_v1_data`): comparte datos con cualquier
  app que use este motor.
- Sin dependencias de build: HTML/CSS/JS plano. Verificado headless (jsdom): arranque,
  las 8 vistas, las 6 pestañas de ficha, command palette, drawers que escriben en el
  estado, export Excel y conciliación con SheetJS — 23/23 sin errores.
