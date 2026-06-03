/* ============================================================================
 * Gestión Equipos Críticos HHHA · Panel de consulta (Resumen · Datos · Ficha)
 * --------------------------------------------------------------------------
 * Capa de presentación rediseñada. Lee el estado real del motor
 * (window.HHHA: inventario, bitácora, pendientes, estados recalculados) y lo
 * publica en el mismo formato que las hojas de Google Sheets, de modo que el
 * panel (Resumen, Datos y Ficha) trabaja sobre datos vivos y consistentes.
 * Archivo FUENTE; el HTML autocontenible lo arma tools/build.js.
 * ========================================================================== */
(function () {
  'use strict';
  const H = window.HHHA;

  // Arranque del motor (igual que la app anterior): semilla + estado persistido
  // en localStorage. El panel es de solo consulta, así que las acciones de UI
  // (avisos/confirmaciones) son inertes.
  H.configure({
    ui: { notify: function () {}, confirm: function () { return true; }, prompt: function () { return null; }, onChange: function () {} },
    env: { xlsx: window.XLSX || null }
  });
  H.setSeed(window.SEED || {});
  H.bootstrapDatos();

  const { MESES, ESTADO_LABEL, TIPO_PENDIENTE, ESTADO_PEND_LABEL, CAUSALES } = H;
  const fmtFecha = H.fmtFecha;

  // ==========================================================================
  // Hojas de datos derivadas del motor (mismo layout que el cuaderno de Sheets)
  // ==========================================================================
  function cuadernoSheets() {
    const S = H.getState(); const hoy = H.hoyLocal();
    const estLbl = e => ESTADO_LABEL[e] || e;
    const fF = v => fmtFecha(v) === '—' ? '' : fmtFecha(v);
    const sheets = [];
    const pendVivos = S.pendientes.filter(p => !p.anulado);
    const pendById = {}; pendVivos.forEach(p => pendById[p.id] = p);
    const eqNom = inv => (H.findEquipo(inv) || {}).equipo || '';
    const eqSrv = inv => (H.findEquipo(inv) || {}).servicio || '';

    // INVENTARIO (ID_EQUIPO = N° Inventario: clave de unión con "N° Inv.")
    sheets.push({
      name: 'Inventario', rows: [
        ['ID_EQUIPO', 'N° Carpeta', 'N° Inventario', 'Equipo', 'Servicio', 'Unidad', 'Ubicación', 'Procedencia', 'Marca', 'Modelo', 'Serie', 'Año Instalación', 'Vida Útil Residual', 'Clasificación', 'ENU / Baja'],
        ...S.equipos.map(e => [e.id, e.carpeta || '', e.inv, e.equipo || '', e.servicio || '', e.unidad || '', e.ubic || '', e.proc || '', e.marca || '', e.modelo || '', e.serie || '', e.ano || '', e.vur || '', e.clasif || '', e.estado === 'baja' ? 'Baja' : 'En uso'])
      ]
    });

    // PENDIENTES
    sheets.push({
      name: 'Pendientes', rows: [
        ['ID_PENDIENTE', 'N° Inv.', 'N° Carpeta', 'Equipo', 'Tipo', 'Descripción', 'Responsable', 'Estado', 'Compromiso', 'Última actualización'],
        ...pendVivos.map(p => { const eq = H.findEquipo(p.inv) || {}; const fs = (p.seguimientos || []).map(s => s.fecha).filter(Boolean); const u = [p.fechaCrea, ...fs, p.fechaCierre].filter(Boolean).sort().pop(); return [p.id, p.inv, eq.carpeta || '', p.equipo || eqNom(p.inv), TIPO_PENDIENTE[p.tipo] || p.tipo, p.desc || '', p.ejecutor || '', ESTADO_PEND_LABEL[p.estado] || p.estado, fF(p.fechaComp), u ? fF(u) : '']; })
      ]
    });

    // TAREAS (Tipo / Responsable / Compromiso derivados del pendiente padre)
    const tareasVivas = (S.tareas || []).filter(t => pendById[t.pendId]);
    sheets.push({
      name: 'Tareas', rows: [
        ['ID_Tareas', 'N° Inv.', 'Equipo', 'Tipo', 'Descripción', 'Responsable', 'Estado', 'Compromiso'],
        ...tareasVivas.map(t => { const p = pendById[t.pendId] || {}; return [t.id, t.inv, t.equipo || eqNom(t.inv), TIPO_PENDIENTE[p.tipo] || p.tipo || '', t.desc || '', p.ejecutor || '', t.estado === 'cerrado' ? 'Hecha' : 'Pendiente', fF(p.fechaComp)]; })
      ]
    });

    // RELACIÓN Tareas ↔ Pendientes (tabla puente)
    sheets.push({
      name: 'Tareas-Pendientes', rows: [
        ['ID_PENDIENTE', 'ID_TAREAS'],
        ...tareasVivas.map(t => [t.pendId, t.id])
      ]
    });

    // BITÁCORA (todos los eventos vigentes + su detalle correctivo)
    sheets.push({
      name: 'Bitácora', rows: [
        ['ID_BITACORA', 'Fecha del evento', 'Fecha registro', 'N° Inv.', 'Equipo', 'Servicio', 'Tipo', 'Resultado', 'Estado equipo', 'Ejecutor', 'N° Informe Folio Solicitud de trabajo', 'N° Envío', 'N° OC', 'N° Cotización', 'Empresa', 'Técnico', 'Observación', 'Oficial'],
        ...S.eventos.filter(e => !e.anulado).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.id - a.id)).map(e => [e.id, fF(e.fecha), fF(e.fechaReg), e.inv, e.equipo || eqNom(e.inv), e.servicio || eqSrv(e.inv), H.etiquetaTipoEvento(e), e.resultado || '', e.estado || '', e.ejecutor || '', e.folio || '', e.nEnvio || '', e.nOC || '', e.nCotiz || '', e.empresa || '', e.tecnico || '', e.obs || '', e.oficial || 'No'])
      ]
    });

    // REGISTRO — todos los eventos por FECHA Y HORA DE CREACIÓN (lo último arriba).
    const tsKey = e => e.ts || (e.fechaReg ? e.fechaReg + 'T00:00:00' : (e.fecha ? e.fecha + 'T00:00:00' : ''));
    const creado = e => { if (e.ts) { const d = new Date(e.ts); if (!isNaN(d)) return d.toLocaleString('es-CL'); } return fF(e.fechaReg) || fF(e.fecha) || ''; };
    sheets.push({
      name: 'Registro', rows: [
        ['Creado', 'ID_BITACORA', 'N° Inv.', 'Equipo', 'Tipo', 'Resultado', 'Estado equipo', 'Ejecutor', 'N° Informe / Folio', 'Observación'],
        ...S.eventos.filter(e => !e.anulado)
          .slice().sort((a, b) => (tsKey(b)).localeCompare(tsKey(a)) || (b.id - a.id))
          .map(e => [creado(e), e.id, e.inv, e.equipo || eqNom(e.inv), H.etiquetaTipoEvento(e), e.resultado || '', e.estado || '', e.ejecutor || '', e.folio || '', e.obs || ''])
      ]
    });

    // EQUIPOS por estado de atención (seguimiento de caídos)
    const colsEstado = ['N° Inv.', 'Equipo', 'Servicio', 'Unidad', 'Ubicación', 'Marca', 'Modelo', 'Días en estado', 'Desde', 'Última gestión', 'Días s/gestión', 'Detalle gestión', 'Encargado', 'Pend. abiertos', 'N° Informe / Folio', 'Apertura ciclo'];
    const filasEstado = est => S.equipos.filter(e => e.estado === est).map(e => {
      const ciclo = H.ciclosAbiertosDe(e.inv)[0];
      const g = H.ultimaGestion(e.inv);
      return [e.inv, e.equipo || '', e.servicio || '', e.unidad || '', e.ubic || '', e.marca || '', e.modelo || '', H.diasEnEstado(e), fF(e.estadoDesde), g ? fF(g.fecha) : '', g ? H.diasEntreFechas(g.fecha, hoy) : '', g ? g.texto : '', H.encargadoDe(e) || '', H.pendientesDe(e.inv).filter(p => p.estado !== 'cerrado').length, ciclo ? (ciclo.folio || '') : '', ciclo ? fF(ciclo.fechaApertura) : ''];
    });
    sheets.push({ name: 'Equipos en servicio técnico', rows: [colsEstado, ...filasEstado('en_servicio_tecnico')] });
    sheets.push({ name: 'Equipos no operativos', rows: [colsEstado, ...filasEstado('no_operativo')] });

    // ASIGNACIONES MP — responsable por equipo y mes (refleja las plantillas).
    const asgAll = S.asignacionesMP || {};
    const asgRows = [];
    Object.keys(asgAll).sort().forEach(km => {
      const parts = String(km).split('-'); const y = parts[0]; const mi = (+parts[1]) - 1;
      const mesNom = MESES[mi] || km; const asg = asgAll[km] || {};
      Object.keys(asg).forEach(inv => {
        const resp = asg[inv]; if (!resp) return;
        const e = H.findEquipo(inv) || {};
        asgRows.push([km, mesNom + ' ' + y, e.carpeta || '', inv, e.equipo || '', e.servicio || '', e.unidad || '', e.marca || '', e.modelo || '', e.freq || '', (e.prog || {})[mesNom] || '', resp]);
      });
    });
    sheets.push({
      name: 'Asignaciones MP', rows: [
        ['Mes', 'Período', 'N° Carpeta', 'N° Inventario', 'Equipo', 'Servicio', 'Unidad', 'Marca', 'Modelo', 'Frecuencia MP', 'Programado', 'Responsable'],
        ...asgRows
      ]
    });

    // CONTACTOS del servicio (vinculados al servicio clínico)
    sheets.push({
      name: 'Contactos', rows: [
        ['Servicio', 'Cargo', 'Nombre', 'Apellido', 'Anexo', 'Correo electrónico'],
        ...H.getContactos().map(c => [c.servicio || '(todos)', c.cargo || '', c.nombre || '', c.apellido || '', c.anexo || '', c.correo || ''])
      ]
    });

    return sheets;
  }

  // Convierte las hojas a { hoja: { cols, rows } } con TODAS las celdas como
  // texto (igual que una exportación de Sheets: el visor asume strings).
  function buildDATA() {
    const out = {};
    cuadernoSheets().forEach(function (s) {
      const rows = s.rows || [];
      const cols = (rows[0] || []).map(c => String(c == null ? '' : c));
      const body = rows.slice(1).map(r => r.map(v => v == null ? '' : String(v)));
      out[s.name] = { cols: cols, rows: body };
    });
    return out;
  }

  // ==========================================================================
  // Estructura del panel (cabecera + vistas + filtro compartido)
  // ==========================================================================
  const SHELL_HTML = `
<div class="head">
  <div class="h-brand">
    <div class="h-mark">SG</div>
    <div>
      <div class="h-t1">SIGEM · Equipos Críticos HHHA</div>
      <div class="h-t2" id="hMeta"></div>
    </div>
  </div>
  <div class="nav">
    <button data-view="resumen" class="on">▦ Resumen</button>
    <button data-view="datos">❑ Datos</button>
    <button data-view="ficha">360 Ficha</button>
  </div>
  <div class="h-meta" id="hCount"></div>
</div>

<!-- ===================== RESUMEN ===================== -->
<div class="view on" id="v-resumen">
  <div class="wrap">
    <p class="r-title">Estado general del parque de equipos</p>
    <div class="kpis" id="kpis"></div>

    <div class="r-cols">
      <div class="card">
        <div class="card-h"><div class="card-t"><span class="ic">◉</span>Estado operativo del parque</div></div>
        <div class="chart-box"><canvas id="chEstado" role="img" aria-label="Distribución de equipos por estado operativo">Distribución por estado.</canvas></div>
        <div class="legend" id="legEstado"></div>
      </div>
      <div class="card">
        <div class="card-h"><div class="card-t"><span class="ic">❑</span>Resultado de mantenciones (bitácora)</div></div>
        <div class="chart-box"><canvas id="chMP" role="img" aria-label="Resultado de las mantenciones registradas">Resultados de mantención.</canvas></div>
        <div class="legend" id="legMP"></div>
      </div>
    </div>

    <div class="r-cols">
      <div class="card">
        <div class="card-h">
          <div class="card-t"><span class="ic" style="color:var(--rd)">⊘</span>Equipos no operativos</div>
          <span class="card-cnt" id="cntNoOp">0</span>
        </div>
        <div style="overflow-x:auto">
          <table class="alert-tbl">
            <thead><tr><th>N° Inv.</th><th>Equipo</th><th>Servicio</th><th>Días estado</th><th>Sin gestión</th></tr></thead>
            <tbody id="tblNoOp"></tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-h">
          <div class="card-t"><span class="ic" style="color:var(--am)">⚙</span>Equipos en servicio técnico</div>
          <span class="card-cnt" id="cntSt">0</span>
        </div>
        <div style="overflow-x:auto">
          <table class="alert-tbl">
            <thead><tr><th>N° Inv.</th><th>Equipo</th><th>Servicio</th><th>Días estado</th><th>Sin gestión</th></tr></thead>
            <tbody id="tblSt"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ===================== DATOS ===================== -->
<div class="view" id="v-datos">
  <div class="wrap">
    <div class="tabs2" id="tabs2"></div>
    <div class="toolbar">
      <div class="search"><input type="text" id="gSearch" placeholder="Buscar en toda la hoja..."></div>
      <div class="tool-info"><b id="rowCount">0</b> de <span id="rowTotal">0</span> filas</div>
      <button class="btn" id="clearAll">Limpiar filtros</button>
      <button class="btn solid" id="exportBtn">Exportar CSV</button>
    </div>
    <div class="active-filters" id="activeFilters"></div>
    <div class="tframe">
      <div class="tscroll">
        <table class="data"><thead><tr id="headRow"></tr></thead><tbody id="bodyRows"></tbody></table>
        <div class="empty" id="emptyMsg" style="display:none">Ninguna fila coincide con los filtros aplicados.</div>
      </div>
      <div class="pager"><span id="pagerInfo"></span><div class="pager-btns" id="pagerBtns"></div></div>
    </div>
  </div>
</div>

<!-- ===================== FICHA ===================== -->
<div class="view" id="v-ficha">
  <div class="wrap">
    <div class="searchbar">
      <input type="text" id="fSearch" placeholder="Buscar por N° inventario, equipo, marca, modelo o servicio..." autocomplete="off">
      <div class="suggest" id="suggest"></div>
    </div>
    <div class="hint">Escribe para buscar entre <b id="totalEq">0</b> equipos · selecciona uno para ver su ficha completa</div>
    <div class="welcome" id="welcome">
      <div class="big">⊕</div>
      <div>Busca un equipo para ver su ficha unificada</div>
      <div style="font-size:12px;margin-top:6px;color:var(--tx3)">Inventario · historial de bitácora · pendientes · estado actual</div>
      <div class="chips" id="quickChips"></div>
    </div>
    <div id="ficha"></div>
  </div>
</div>

<!-- shared filter dropdown -->
<div class="fdrop" id="fdrop">
  <div class="fdrop-sort"><button data-sort="asc">↑ Ordenar A–Z</button><button data-sort="desc">↓ Ordenar Z–A</button></div>
  <div class="fdrop-search"><input type="text" id="fdropSearch" placeholder="Buscar valores..."></div>
  <div class="fdrop-actions"><a id="selAll">Seleccionar todo</a><a id="selNone">Quitar todo</a></div>
  <div class="fdrop-list" id="fdropList"></div>
  <div class="fdrop-foot"><button id="fdropCancel">Cancelar</button><button class="apply" id="fdropApply">Aplicar</button></div>
</div>
`;
  (document.getElementById('root') || document.body).innerHTML = SHELL_HTML;

  const DATA = buildDATA();
  const META = { actualizado: 'Datos al ' + H.hoyLocal() };

  // ==========================================================================
  // Presentación (Resumen · Datos · Ficha) — opera sobre DATA
  // ==========================================================================

const C = (sheet,name)=>DATA[sheet]?DATA[sheet].cols.indexOf(name):-1;
document.getElementById('hMeta').textContent = META.actualizado || 'Gestión Equipos Críticos HHHA';

/* ---------- Build per-equipment index by joining sheets ---------- */
const INV = DATA['Inventario'];
const iInv = {
  id:C('Inventario','ID_EQUIPO'), carp:C('Inventario','N° Carpeta'), inv:C('Inventario','N° Inventario'),
  eq:C('Inventario','Equipo'), sv:C('Inventario','Servicio'), un:C('Inventario','Unidad'),
  ub:C('Inventario','Ubicación'), pr:C('Inventario','Procedencia'), ma:C('Inventario','Marca'),
  mo:C('Inventario','Modelo'), se:C('Inventario','Serie'), an:C('Inventario','Año Instalación'),
  vur:C('Inventario','Vida Útil Residual'), cl:C('Inventario','Clasificación'), enu:C('Inventario','ENU / Baja')
};
const EQ = {};
INV.rows.forEach(r=>{
  const inv=r[iInv.inv]; if(!inv) return;
  EQ[inv]={inv, idEq:r[iInv.id], carpeta:r[iInv.carp], equipo:r[iInv.eq], servicio:r[iInv.sv],
    unidad:r[iInv.un], ubic:r[iInv.ub], proc:r[iInv.pr], marca:r[iInv.ma], modelo:r[iInv.mo],
    serie:r[iInv.se], anio:r[iInv.an], vur:r[iInv.vur], clasif:r[iInv.cl], enu:r[iInv.enu],
    hist:[], pend:[], estado:''};
});

/* Bitácora -> history (sorted desc by event date) */
const B=DATA['Bitácora'];
const iB={f:C('Bitácora','Fecha del evento'),fr:C('Bitácora','Fecha registro'),inv:C('Bitácora','N° Inv.'),
  tipo:C('Bitácora','Tipo'),res:C('Bitácora','Resultado'),est:C('Bitácora','Estado equipo'),
  ej:C('Bitácora','Ejecutor'),emp:C('Bitácora','Empresa'),
  fol:C('Bitácora','N° Informe Folio Solicitud de trabajo'),obs:C('Bitácora','Observación')};
const bsorted=[...B.rows].sort((a,b)=>(b[iB.f]||'').localeCompare(a[iB.f]||''));
bsorted.forEach(r=>{
  const inv=r[iB.inv]; if(!EQ[inv]) return;
  EQ[inv].hist.push({fecha:r[iB.f],freg:r[iB.fr],tipo:r[iB.tipo],res:r[iB.res],estado:r[iB.est],
    ejec:r[iB.ej],empresa:r[iB.emp],folio:r[iB.fol],obs:r[iB.obs]});
});

/* Pendientes */
const P=DATA['Pendientes'];
const iP={inv:C('Pendientes','N° Inv.'),tipo:C('Pendientes','Tipo'),desc:C('Pendientes','Descripción'),
  resp:C('Pendientes','Responsable'),est:C('Pendientes','Estado'),comp:C('Pendientes','Compromiso')};
P.rows.forEach(r=>{
  const inv=r[iP.inv]; if(!EQ[inv]) return;
  EQ[inv].pend.push({tipo:r[iP.tipo],desc:r[iP.desc],resp:r[iP.resp],estado:r[iP.est],comp:r[iP.comp]});
});

/* current estado: dedicated sheets win, then baja, then operativo */
const noOpSet=new Set(), stSet=new Set();
const NO=DATA['Equipos no operativos'], ST=DATA['Equipos en servicio técnico'];
NO.rows.forEach(r=>noOpSet.add(r[C('Equipos no operativos','N° Inv.')]));
ST.rows.forEach(r=>stSet.add(r[C('Equipos en servicio técnico','N° Inv.')]));
Object.values(EQ).forEach(e=>{
  if(noOpSet.has(e.inv)) e.estado='no operativo';
  else if(stSet.has(e.inv)) e.estado='en servicio técnico';
  else if((e.enu||'').toLowerCase().includes('baja')) e.estado='baja';
  else e.estado='operativo';
});

const keys=Object.keys(EQ);
document.getElementById('hCount').textContent = keys.length.toLocaleString()+' equipos';
document.getElementById('totalEq').textContent = keys.length.toLocaleString();

/* ---------- shared helpers ---------- */
function vurClass(v){const n=parseInt(v);if(isNaN(n))return '';if(n<0)return 'vur-neg';if(n<=2)return 'vur-warn';return 'vur-ok';}
function resBadge(r){
  if(r==='Si')return '<span class="rbadge r-ok">Realizada</span>';
  if(['No','FS','NU'].includes(r))return `<span class="rbadge r-bad">${r}</span>`;
  if(r==='Baja')return '<span class="rbadge r-mut">Baja</span>';
  if(/^C\d/.test(r))return `<span class="rbadge r-warn">${r}</span>`;
  return r?`<span class="rbadge r-mut">${r}</span>`:'';
}
function estadoClass(e){
  e=(e||'').toLowerCase();
  if(e.includes('no')&&e.includes('oper'))return ['e-no','No operativo'];
  if(e.includes('oper'))return ['e-op','Operativo'];
  if(e.includes('servicio'))return ['e-st','En servicio técnico'];
  if(e.includes('baja'))return ['e-ba','Baja'];
  return ['e-dk',e||'Sin registro'];
}

/* ===================== RESUMEN ===================== */
function buildResumen(){
  const tot=keys.length;
  const noOp=noOpSet.size, st=stSet.size;
  const baja=Object.values(EQ).filter(e=>e.estado==='baja').length;
  const oper=tot-noOp-st-baja;
  const vencidos=Object.values(EQ).filter(e=>{const n=parseInt(e.vur);return !isNaN(n)&&n<0}).length;
  const criticos=Object.values(EQ).filter(e=>{const n=parseInt(e.vur);return !isNaN(n)&&n>=0&&n<=2}).length;
  const pendAb=P.rows.filter(r=>!(r[iP.est]||'').toLowerCase().includes('resuel')).length;

  const kpiDefs=[
    ['cy','Equipos totales',tot.toLocaleString(),'en inventario'],
    ['gn','Operativos',oper.toLocaleString(),`${(oper/tot*100).toFixed(0)}% del parque`],
    ['rd','No operativos',noOp.toLocaleString(),'requieren gestión'],
    ['am','En servicio técnico',st.toLocaleString(),'fuera de unidad'],
    ['rd','Vida útil vencida',vencidos.toLocaleString(),`+ ${criticos} críticos (≤2 años)`],
    ['pp','Pendientes abiertos',pendAb.toLocaleString(),`de ${P.rows.length} registrados`]
  ];
  document.getElementById('kpis').innerHTML=kpiDefs.map(k=>
    `<div class="kpi ${k[0]}"><div class="lbl">${k[1]}</div><div class="num">${k[2]}</div><div class="sub">${k[3]}</div></div>`).join('');

  // estado doughnut
  const estData=[oper,noOp,st,baja];
  const estLbl=['Operativo','No operativo','En servicio técnico','Baja'];
  const estCol=['#4ade80','#f87171','#fbbf24','#5a6470'];
  document.getElementById('legEstado').innerHTML=estLbl.map((l,i)=>
    `<span><i style="background:${estCol[i]}"></i>${l} ${estData[i]}</span>`).join('');

  // MP results bar
  const resCount={};
  B.rows.forEach(r=>{const v=r[iB.res]||'(sin dato)';resCount[v]=(resCount[v]||0)+1});
  const order=['Si','C2','C3','C5','C6','C7','C8','C1','No','NU','Baja','(sin dato)'];
  const mpLbl=order.filter(o=>resCount[o]);
  const mpVal=mpLbl.map(o=>resCount[o]);
  const mpCol=mpLbl.map(o=>o==='Si'?'#22c55e':(/^C/.test(o)?'#d99518':(['No','FS','NU'].includes(o)?'#dc4d4d':'#5a6470')));
  document.getElementById('legMP').innerHTML=
    `<span><i style="background:#22c55e"></i>Realizada (Si)</span>`+
    `<span><i style="background:#d99518"></i>Reprogramada (C1–C8)</span>`+
    `<span><i style="background:#dc4d4d"></i>No realizada</span>`;

  renderCharts(estData,estLbl,estCol,mpLbl,mpVal,mpCol);

  // alert tables
  const diasCell=(v)=>{const n=parseInt(v);const c=isNaN(n)?'lo':(n>=60?'hi':(n>=30?'mid':'lo'));return `<span class="dias ${c}">${isNaN(n)?'—':n}</span>`};
  const buildAlert=(sheet,tbodyId,cntId)=>{
    const S=DATA[sheet];
    const ci={inv:C(sheet,'N° Inv.'),eq:C(sheet,'Equipo'),sv:C(sheet,'Servicio'),
      de:C(sheet,'Días en estado'),dg:C(sheet,'Días s/gestión')};
    const rows=[...S.rows].sort((a,b)=>(parseInt(b[ci.dg])||0)-(parseInt(a[ci.dg])||0));
    document.getElementById(cntId).textContent=rows.length;
    document.getElementById(tbodyId).innerHTML=rows.map(r=>
      `<tr data-inv="${r[ci.inv]}"><td class="alert-inv">${r[ci.inv]}</td><td>${r[ci.eq]}</td><td style="color:var(--tx3)">${r[ci.sv]}</td><td>${diasCell(r[ci.de])}</td><td>${diasCell(r[ci.dg])}</td></tr>`).join('')
      || '<tr><td colspan="5" class="empty-sm">Sin equipos en este estado</td></tr>';
    document.querySelectorAll(`#${tbodyId} tr[data-inv]`).forEach(tr=>{
      tr.onclick=()=>{switchView('ficha');openFicha(tr.dataset.inv)};
    });
  };
  buildAlert('Equipos no operativos','tblNoOp','cntNoOp');
  buildAlert('Equipos en servicio técnico','tblSt','cntSt');
}

let chEstado,chMP;
function renderCharts(eD,eL,eC,mL,mV,mC){
  if(typeof Chart==='undefined')return;
  try{
    if(chEstado)chEstado.destroy();
    chEstado=new Chart(document.getElementById('chEstado'),{type:'doughnut',
      data:{labels:eL,datasets:[{data:eD,backgroundColor:eC,borderWidth:2,borderColor:'#161b22'}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false}}}});
    if(chMP)chMP.destroy();
    chMP=new Chart(document.getElementById('chMP'),{type:'bar',
      data:{labels:mL,datasets:[{data:mV,backgroundColor:mC,borderRadius:4,borderSkipped:false}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
        tooltip:{callbacks:{label:c=>` ${c.parsed.y} eventos`}}},
        scales:{x:{ticks:{color:'#5a6470',font:{size:11}},grid:{display:false}},
        y:{ticks:{color:'#5a6470',font:{size:11}},grid:{color:'#2a323d'}}}}});
  }catch(e){console.warn('Charts no disponibles:',e)}
}

/* ===================== DATOS (table viewer) ===================== */
const SHEET_ICONS={'Inventario':'▦','Pendientes':'◷','Tareas':'☑','Tareas-Pendientes':'⇄',
  'Bitácora':'❑','Registro':'⊟','Equipos en servicio técnico':'⚙','Equipos no operativos':'⊘',
  'Contactos':'☏','Actividad':'⟳'};
const DATA_SHEETS=Object.keys(DATA);
const PAGE_SIZE=60;
let curSheet=DATA_SHEETS[0];
let state={};
let view=[];
function st(s){if(!state[s])state[s]={filters:{},sort:null,search:'',page:1};return state[s];}

function buildTabs2(){
  const t=document.getElementById('tabs2');t.innerHTML='';
  DATA_SHEETS.forEach(s=>{
    const d=document.createElement('div');
    d.className='tab2'+(s===curSheet?' on':'');
    d.innerHTML=`<span style="font-size:13px">${SHEET_ICONS[s]||'▤'}</span>${s}<span class="c">${DATA[s].rows.length}</span>`;
    d.onclick=()=>{curSheet=s;document.getElementById('gSearch').value=st(s).search;renderTable();buildTabs2()};
    t.appendChild(d);
  });
}
function badgeFor(col,val){
  const c=(col||'').toLowerCase();
  if(c==='resultado'){
    if(val==='Si')return '<span class="badge b-ok">Si</span>';
    if(['No','FS','NU'].includes(val))return `<span class="badge b-bad">${val}</span>`;
    if(val==='Baja')return '<span class="badge b-mut">Baja</span>';
    if(/^C\d/.test(val))return `<span class="badge b-warn">${val}</span>`;
  }
  if(c==='estado'||c==='estado equipo'){
    if(/operativo/i.test(val)&&!/no/i.test(val))return `<span class="badge b-ok">${val}</span>`;
    if(/no.?operativo/i.test(val))return `<span class="badge b-bad">${val}</span>`;
    if(/servicio/i.test(val))return `<span class="badge b-warn">${val}</span>`;
    if(/baja/i.test(val))return `<span class="badge b-mut">${val}</span>`;
  }
  if(c==='vida útil residual'){const n=parseInt(val);if(!isNaN(n)){
    if(n<0)return `<span style="color:var(--rd);font-weight:500">${val}</span>`;
    if(n<=2)return `<span style="color:var(--am)">${val}</span>`;
    return `<span style="color:var(--gn)">${val}</span>`;}}
  return val||'<span style="color:var(--tx3)">—</span>';
}
function compute(){
  const s=st(curSheet),{rows}=DATA[curSheet];
  let r=rows.filter(row=>{
    for(const ci in s.filters){if(s.filters[ci].size&&!s.filters[ci].has(row[ci]))return false;}
    if(s.search&&!row.join(' ').toLowerCase().includes(s.search.toLowerCase()))return false;
    return true;
  });
  if(s.sort){const ci=s.sort.col,dir=s.sort.dir==='asc'?1:-1;
    r=[...r].sort((a,b)=>{const x=a[ci]||'',y=b[ci]||'';const nx=parseFloat(x),ny=parseFloat(y);
      if(!isNaN(nx)&&!isNaN(ny))return (nx-ny)*dir;return x.localeCompare(y,'es')*dir;});}
  view=r;
}
function renderTable(){
  compute();
  const s=st(curSheet),{cols}=DATA[curSheet];
  const invCi=cols.indexOf('N° Inv.')>=0?cols.indexOf('N° Inv.'):cols.indexOf('N° Inventario');
  const head=document.getElementById('headRow');head.innerHTML='';
  cols.forEach((c,ci)=>{
    const th=document.createElement('th');
    const hasF=s.filters[ci]&&s.filters[ci].size>0;
    const sm=s.sort&&s.sort.col===ci?(s.sort.dir==='asc'?'↑':'↓'):'';
    th.innerHTML=`<div class="th-in"><span class="th-lbl">${c}</span><span class="th-sort">${sm}</span><span class="fbtn ${hasF?'on':''}" data-ci="${ci}">▼</span></div>`;
    th.querySelector('.th-lbl').onclick=()=>toggleSort(ci);
    th.querySelector('.fbtn').onclick=(e)=>{e.stopPropagation();openFilter(ci,e.target)};
    head.appendChild(th);
  });
  const total=view.length,totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  if(s.page>totalPages)s.page=totalPages;
  const start=(s.page-1)*PAGE_SIZE,slice=view.slice(start,start+PAGE_SIZE);
  const body=document.getElementById('bodyRows'),em=document.getElementById('emptyMsg');
  if(total===0){body.innerHTML='';em.style.display='block'}
  else{em.style.display='none';
    body.innerHTML=slice.map(row=>'<tr>'+row.map((v,ci)=>{
      if(ci===invCi&&EQ[v])return `<td class="inv" data-inv="${v}">${v}</td>`;
      return `<td title="${(v||'').replace(/"/g,'&quot;')}">${badgeFor(cols[ci],v)}</td>`;
    }).join('')+'</tr>').join('');
    document.querySelectorAll('#bodyRows td.inv').forEach(td=>{
      td.onclick=()=>{switchView('ficha');openFicha(td.dataset.inv)};});
  }
  document.getElementById('rowCount').textContent=total.toLocaleString();
  document.getElementById('rowTotal').textContent=DATA[curSheet].rows.length.toLocaleString();
  document.getElementById('pagerInfo').textContent=total?`${start+1}–${Math.min(start+PAGE_SIZE,total)} de ${total.toLocaleString()}`:'0 filas';
  const pb=document.getElementById('pagerBtns');pb.innerHTML='';
  const mk=(l,pg,dis,act)=>{const b=document.createElement('button');b.className='pbtn'+(act?' active':'');b.textContent=l;b.disabled=dis;b.onclick=()=>{s.page=pg;renderTable()};return b};
  pb.appendChild(mk('‹',s.page-1,s.page<=1));
  let s2=Math.max(1,s.page-2),e2=Math.min(totalPages,s2+4);s2=Math.max(1,e2-4);
  for(let i=s2;i<=e2;i++)pb.appendChild(mk(i,i,false,i===s.page));
  pb.appendChild(mk('›',s.page+1,s.page>=totalPages));
  renderActiveFilters();
}
function renderActiveFilters(){
  const s=st(curSheet),{cols}=DATA[curSheet],af=document.getElementById('activeFilters');af.innerHTML='';
  for(const ci in s.filters){if(s.filters[ci].size>0){
    const p=document.createElement('div');p.className='fpill';const n=s.filters[ci].size;
    p.innerHTML=`${cols[ci]}: ${n} valor${n>1?'es':''} <span class="x" data-ci="${ci}">✕</span>`;
    p.querySelector('.x').onclick=()=>{delete s.filters[ci];renderTable()};af.appendChild(p);}}
}
function toggleSort(ci){const s=st(curSheet);
  if(s.sort&&s.sort.col===ci)s.sort.dir=s.sort.dir==='asc'?'desc':'asc';
  else s.sort={col:ci,dir:'asc'};renderTable();}

let pendingSel=null;
function openFilter(ci,anchor){
  const s=st(curSheet),{rows}=DATA[curSheet];
  const counts={};
  rows.forEach(row=>{let ok=true;
    for(const fci in s.filters){if(fci==ci)continue;if(s.filters[fci].size&&!s.filters[fci].has(row[fci])){ok=false;break}}
    if(s.search&&!row.join(' ').toLowerCase().includes(s.search.toLowerCase()))ok=false;
    if(ok){const v=row[ci];counts[v]=(counts[v]||0)+1}});
  const uniques=Object.keys(counts).sort((a,b)=>{const na=parseFloat(a),nb=parseFloat(b);
    if(!isNaN(na)&&!isNaN(nb))return na-nb;return a.localeCompare(b,'es')});
  const cur=s.filters[ci];pendingSel=new Set(cur&&cur.size?cur:uniques);
  const list=document.getElementById('fdropList');
  const renderList=(q='')=>{list.innerHTML='';
    uniques.filter(u=>u.toLowerCase().includes(q.toLowerCase())).forEach(u=>{
      const row=document.createElement('label');row.className='fopt';
      const disp=u===''?'(vacío)':u;
      row.innerHTML=`<input type="checkbox" ${pendingSel.has(u)?'checked':''}><span class="lbl" title="${disp}">${disp}</span><span class="qty">${counts[u]}</span>`;
      row.querySelector('input').onchange=(e)=>{e.target.checked?pendingSel.add(u):pendingSel.delete(u)};
      list.appendChild(row);});};
  renderList();
  const ds=document.getElementById('fdropSearch');ds.value='';ds.oninput=()=>renderList(ds.value);
  document.getElementById('selAll').onclick=()=>{uniques.forEach(u=>pendingSel.add(u));renderList(ds.value)};
  document.getElementById('selNone').onclick=()=>{pendingSel.clear();renderList(ds.value)};
  document.querySelectorAll('.fdrop-sort button').forEach(b=>{b.onclick=()=>{s.sort={col:ci,dir:b.dataset.sort};hideDrop();renderTable()};});
  document.getElementById('fdropApply').onclick=()=>{
    if(pendingSel.size===uniques.length)delete s.filters[ci];else s.filters[ci]=new Set(pendingSel);
    s.page=1;hideDrop();renderTable();};
  document.getElementById('fdropCancel').onclick=hideDrop;
  const drop=document.getElementById('fdrop'),r=anchor.getBoundingClientRect();
  drop.style.top=(r.bottom+4)+'px';let left=r.right-250;if(left<8)left=8;drop.style.left=left+'px';
  drop.classList.add('show');
}
function hideDrop(){document.getElementById('fdrop').classList.remove('show')}
document.addEventListener('click',(e)=>{const drop=document.getElementById('fdrop');
  if(drop.classList.contains('show')&&!drop.contains(e.target)&&!e.target.classList.contains('fbtn'))hideDrop();});
document.getElementById('gSearch').oninput=(e)=>{const s=st(curSheet);s.search=e.target.value;s.page=1;renderTable();};
document.getElementById('clearAll').onclick=()=>{const s=st(curSheet);s.filters={};s.sort=null;s.search='';
  document.getElementById('gSearch').value='';renderTable();};
document.getElementById('exportBtn').onclick=()=>{
  const {cols}=DATA[curSheet];const esc=v=>`"${(v||'').replace(/"/g,'""')}"`;
  const lines=[cols.map(esc).join(',')];view.forEach(r=>lines.push(r.map(esc).join(',')));
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`SIGEM_${curSheet.replace(/[^\w]/g,'_')}.csv`;a.click();};

/* ===================== FICHA ===================== */
function pendStatus(s){s=(s||'').toLowerCase();if(s.includes('resuel'))return 'ps-ok';if(s.includes('proceso'))return 'ps-proc';return 'ps-no';}
function evClass(tipo){const t=(tipo||'').toLowerCase();
  if(t.includes('reprog'))return 'ev-rep';if(t.includes('preventiva'))return 'ev-mp';
  if(t.includes('servicio')||t.includes('recep')||t.includes('compra'))return 'ev-st';
  if(t.includes('solicitud')||t.includes('visita'))return 'ev-sol';return '';}
function fscore(q,e){q=q.toLowerCase();const inv=e.inv.toLowerCase();
  if(inv===q)return 100;if(inv.includes(q))return 80;
  const blob=`${e.equipo} ${e.marca} ${e.modelo} ${e.servicio} ${e.serie}`.toLowerCase();
  if(blob.includes(q))return 40;return 0;}
let kbdIdx=-1,curMatches=[];
function doFSearch(q){
  const sg=document.getElementById('suggest');
  if(!q.trim()){sg.classList.remove('show');return}
  curMatches=keys.map(k=>EQ[k]).map(e=>({e,s:fscore(q,e)})).filter(x=>x.s>0)
    .sort((a,b)=>b.s-a.s).slice(0,30).map(x=>x.e);
  if(!curMatches.length){sg.innerHTML='<div class="sg-item" style="color:var(--tx3)">Sin coincidencias</div>';sg.classList.add('show');return}
  kbdIdx=-1;
  sg.innerHTML=curMatches.map(e=>`<div class="sg-item" data-inv="${e.inv}"><span class="sg-inv">${e.inv}</span><span><span style="font-size:13px">${e.equipo}</span><br><span style="font-size:11px;color:var(--tx3)">${e.marca} ${e.modelo}</span></span><span class="sg-sv">${e.servicio}</span></div>`).join('');
  sg.querySelectorAll('.sg-item').forEach(it=>{if(it.dataset.inv)it.onclick=()=>openFicha(it.dataset.inv);});
  sg.classList.add('show');
}
function openFicha(inv){
  const e=EQ[inv];if(!e)return;
  document.getElementById('suggest').classList.remove('show');
  document.getElementById('fSearch').value=`${e.inv} — ${e.equipo}`;
  document.getElementById('welcome').style.display='none';
  const [ec,etxt]=estadoClass(e.estado);
  const histCount=e.hist.length,pendCount=e.pend.length;
  const pendAb=e.pend.filter(p=>!(p.estado||'').toLowerCase().includes('resuel')).length;
  const cell=(k,v,cls='')=>`<div class="f-cell"><div class="k">${k}</div><div class="v ${cls}">${v||'—'}</div></div>`;
  const histHTML=histCount?e.hist.map(h=>`
    <div class="tl-item ${evClass(h.tipo)}">
      <div class="tl-top"><span class="tl-date">${h.fecha||'—'}</span><span class="tl-tipo">${h.tipo||'Evento'}</span>${resBadge(h.res)}</div>
      <div class="tl-meta">
        ${h.estado?`<span><b>Estado:</b> ${h.estado}</span>`:''}
        ${h.ejec?`<span><b>Ejecutor:</b> ${h.ejec}</span>`:''}
        ${h.empresa?`<span><b>Empresa:</b> ${h.empresa}</span>`:''}
        ${h.folio?`<span><b>Folio:</b> ${h.folio}</span>`:''}
      </div>
      ${h.obs?`<div class="tl-obs">${h.obs}</div>`:''}
    </div>`).join(''):'<div class="empty-sm">Sin eventos registrados en bitácora</div>';
  const pendHTML=pendCount?e.pend.map(p=>`
    <div class="pend">
      <div class="pend-top"><span class="pend-tipo">${p.tipo||'Pendiente'}</span><span class="pst ${pendStatus(p.estado)}">${p.estado||'—'}</span></div>
      ${p.desc?`<div class="pend-desc">${p.desc}</div>`:''}
      <div class="pend-meta">${p.resp?`<span>Responsable: ${p.resp}</span>`:''}${p.comp?`<span>Compromiso: ${p.comp}</span>`:''}</div>
    </div>`).join(''):'<div class="empty-sm">Sin pendientes registrados</div>';
  document.getElementById('ficha').innerHTML=`
    <div class="f-hero">
      <div class="f-hero-top">
        <div><div class="f-eq">${e.equipo}</div><div class="f-inv">N° Inv. ${e.inv} ${e.idEq?`· ID ${e.idEq}`:''}</div></div>
        <div class="f-tags"><span class="estado ${ec}">${etxt}</span><button class="print-btn" onclick="window.print()">Imprimir ficha</button></div>
      </div>
      <div class="f-grid">
        ${cell('Marca',e.marca)}${cell('Modelo',e.modelo)}${cell('Serie',e.serie)}
        ${cell('Servicio',e.servicio)}${cell('Unidad',e.unidad)}${cell('Ubicación',e.ubic)}
        ${cell('Procedencia',e.proc)}${cell('Año instalación',e.anio)}${cell('Vida útil residual',e.vur,vurClass(e.vur))}
        ${cell('Clasificación',e.clasif)}${cell('N° Carpeta',e.carpeta)}${cell('ENU / Baja',e.enu)}
      </div>
    </div>
    <div class="fcols">
      <div class="card">
        <div class="card-h"><div class="card-t"><span class="ic">❑</span>Historial de bitácora</div><span class="card-cnt">${histCount} evento${histCount!==1?'s':''}</span></div>
        <div style="padding:6px 0"><div class="tl">${histHTML}</div></div>
      </div>
      <div class="card">
        <div class="card-h"><div class="card-t"><span class="ic">◷</span>Pendientes</div><span class="card-cnt">${pendAb} abierto${pendAb!==1?'s':''} / ${pendCount}</span></div>
        <div style="padding:6px 0">${pendHTML}</div>
      </div>
    </div>`;
  window.scrollTo({top:0,behavior:'smooth'});
}
const fsi=document.getElementById('fSearch');
fsi.oninput=()=>doFSearch(fsi.value);
fsi.onfocus=()=>{if(fsi.value&&!fsi.value.includes('—'))doFSearch(fsi.value)};
fsi.onkeydown=(ev)=>{const sg=document.getElementById('suggest');
  if(!sg.classList.contains('show'))return;
  const items=sg.querySelectorAll('.sg-item[data-inv]');
  if(ev.key==='ArrowDown'){ev.preventDefault();kbdIdx=Math.min(kbdIdx+1,items.length-1)}
  else if(ev.key==='ArrowUp'){ev.preventDefault();kbdIdx=Math.max(kbdIdx-1,0)}
  else if(ev.key==='Enter'){ev.preventDefault();if(kbdIdx>=0&&items[kbdIdx])openFicha(items[kbdIdx].dataset.inv);else if(curMatches[0])openFicha(curMatches[0].inv);return}
  else if(ev.key==='Escape'){sg.classList.remove('show');return}
  items.forEach((it,i)=>it.classList.toggle('kbd',i===kbdIdx));
  if(items[kbdIdx])items[kbdIdx].scrollIntoView({block:'nearest'});};
document.addEventListener('click',(ev)=>{if(!ev.target.closest('.searchbar'))document.getElementById('suggest').classList.remove('show');});

const interesting=keys.map(k=>EQ[k]).sort((a,b)=>(b.hist.length+b.pend.length*3)-(a.hist.length+a.pend.length*3)).slice(0,6);
document.getElementById('quickChips').innerHTML=interesting.map(e=>`<div class="chip" data-inv="${e.inv}">${e.inv} · ${e.equipo}</div>`).join('');
document.querySelectorAll('#quickChips .chip').forEach(c=>c.onclick=()=>openFicha(c.dataset.inv));

/* ===================== NAV ===================== */
let datosBuilt=false;
function switchView(v){
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('on'));
  document.getElementById('v-'+v).classList.add('on');
  if(v==='datos'&&!datosBuilt){buildTabs2();renderTable();datosBuilt=true;}
}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));

/* init */
buildResumen();

})();
