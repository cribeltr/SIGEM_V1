/* ============================================================================
 * SIGEM · Capa de vistas NUEVA (densa "pro"). Sólo presentación: toda la
 * lógica vive en HHHA (hhha-core.js). Inicio = cola de trabajo accionable.
 * ==========================================================================*/
(function () {
  'use strict';
  const H = window.HHHA;
  if (!H) { document.body.innerHTML = '<p style="padding:20px">Falta hhha-core.js</p>'; return; }

  // ----------------------------- mini DOM -----------------------------------
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) { if (c == null || c === false) continue; n.appendChild(c.nodeType ? c : document.createTextNode(String(c))); }
    return n;
  }
  const $ = (s, e = document) => e.querySelector(s);
  const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); return n; };
  const mount = (n, ...k) => { clear(n); k.flat().forEach(c => c != null && c !== false && n.appendChild(c.nodeType ? c : document.createTextNode(String(c)))); return n; };

  // ----------------------------- icons (inline svg) -------------------------
  const ic = {
    inicio: 'M3 11h18M5 11V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v6m-6 0v3a2 2 0 0 1-4 0v-3',
    equipos: 'M4 5h16v12H4zM2 21h20M9 9h6',
    pendientes: 'M9 11l3 3 8-8M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0',
    ciclos: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
    eventos: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    asignaciones: 'M7 3v4M17 3v4M3 9h18M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
    conciliacion: 'M18 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 24a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 18V9a3 3 0 0 1 3-3h6',
    cumplimiento: 'M3 3v18h18M7 16l4-5 3 3 5-7',
    audit: 'M3 5h13M3 10h13M3 15h7M19 13l2 2-4 4-2-1 1-3z',
    search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
    plus: 'M12 5v14M5 12h14', sun: 'M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6L19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4L19 5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', menu: 'M3 6h18M3 12h18M3 18h18',
    dl: 'M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16', up: 'M12 21V9m0 0l4 4m-4-4l-4 4M4 3h16',
    x: 'M6 6l12 12M18 6L6 18', chev: 'M9 6l6 6-6 6', dots: 'M12 5h.01M12 12h.01M12 19h.01'
  };
  function svg(d, w) { return h('span', { class: 'ico', html: `<svg width="${w || 17}" height="${w || 17}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d.split('M').filter(Boolean).map(p => `<path d="M${p}"/>`).join('')}</svg>` }); }

  // ----------------------------- catálogos / helpers ------------------------
  const { MESES, EJECUTORES, TIPOS_EVENTO, CAUSALES, ESTADO_LABEL, TIPO_PENDIENTE, ESTADO_PEND_LABEL, MOTIVOS_ANULACION } = H;
  const fmtFecha = H.fmtFecha;
  const NOW = new Date(); const YEAR = NOW.getFullYear(); const MONTH = NOW.getMonth();
  const ESTADO_CLS = { operativo: 'op', no_operativo: 'noop', en_servicio_tecnico: 'st', baja: 'baja', desconocido: 'desc' };

  function estadoPill(estado) {
    return h('span', { class: 'pill ' + (ESTADO_CLS[estado] || 'desc') }, h('span', { class: 'dot' }), ESTADO_LABEL[estado] || estado);
  }
  function pendPill(estado) {
    const c = estado === 'cerrado' ? 'op' : estado === 'en_proceso' ? 'st' : 'noop';
    return h('span', { class: 'pill ' + c }, ESTADO_PEND_LABEL[estado] || estado);
  }
  function mpResultClass(r) {
    if (!r) return '';
    if (r === 'Si') return 'ok';
    if (/^C[1-8]$/.test(r)) return 're';
    if (r === 'Baja') return 'bad';
    return 'bad';
  }
  function norm(s) { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  // ----------------------------- toast --------------------------------------
  const toastRoot = h('div', { class: 'toast-root' }); document.body.appendChild(toastRoot);
  function toast(msg, type, action) {
    const t = h('div', { class: 'toast ' + (type || '') },
      h('span', {}, msg),
      action ? h('span', { class: 't-act', onclick: () => { (action.run || action.fn) && (action.run || action.fn)(); t.remove(); } }, action.label) : null
    );
    toastRoot.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, action ? 7000 : 3600);
  }

  // ----------------------------- drawer -------------------------------------
  const scrim = h('div', { class: 'scrim', onclick: () => closeDrawer() }); document.body.appendChild(scrim);
  const drawer = h('aside', { class: 'drawer' }); document.body.appendChild(drawer);
  let drawerOpen = false;
  function openDrawer(opts) {
    mount(drawer,
      h('div', { class: 'd-hd' }, h('h2', {}, opts.title), h('button', { class: 'btn icon ghost', onclick: () => closeDrawer() }, svg(ic.x, 16))),
      h('div', { class: 'd-bd' }, opts.body),
      opts.footer ? h('div', { class: 'd-ft' }, opts.footer) : null
    );
    drawer.classList.toggle('wide', !!opts.wide);
    requestAnimationFrame(() => { drawer.classList.add('on'); scrim.classList.add('on'); });
    drawerOpen = true;
    if (opts.focus) setTimeout(() => { const f = drawer.querySelector(opts.focus); f && f.focus(); }, 90);
  }
  function closeDrawer() { drawer.classList.remove('on'); scrim.classList.remove('on'); drawerOpen = false; }

  function field(label, ctrl) { return h('div', { class: 'field' }, label ? h('label', {}, label) : null, ctrl); }
  function selectEl(options, value, attrs) {
    return h('select', attrs || {}, ...options.map(o => {
      const val = Array.isArray(o) ? o[0] : o, lbl = Array.isArray(o) ? o[1] : o;
      return h('option', { value: val, selected: String(val) === String(value) ? true : false }, lbl);
    }));
  }

  // ----------------------------- engine UI/env wiring -----------------------
  H.configure({
    ui: {
      notify: (m, t, a) => toast(m, t, a),
      confirm: (m) => window.confirm(m),
      prompt: (m) => window.prompt(m),
      onChange: () => { scheduleRefresh(); }
    },
    env: { xlsx: window.XLSX || null }
  });
  let refreshT = null;
  function scheduleRefresh() { clearTimeout(refreshT); refreshT = setTimeout(() => { renderView(); refreshChrome(); }, 30); }

  // ============================ ROUTER ======================================
  const NAV = [
    { id: 'inicio', label: 'Cola de trabajo', icon: 'inicio' },
    { id: 'equipos', label: 'Equipos', icon: 'equipos' },
    { id: 'pendientes', label: 'Pendientes', icon: 'pendientes' },
    { id: 'ciclos', label: 'Ciclos', icon: 'ciclos' },
    { id: 'eventos', label: 'Eventos', icon: 'eventos' },
    { id: 'asignaciones', label: 'Asignaciones MP', icon: 'asignaciones' },
    { id: 'cumplimiento', label: 'Cumplimiento', icon: 'cumplimiento' },
    { id: 'conciliacion', label: 'Conciliación', icon: 'conciliacion' }
  ];
  let view = 'inicio', params = {};
  let kbList = null; // {rows, open, idx} para navegación j/k
  function go(v, p) { view = v; params = p || {}; kbList = null; location.hash = '#' + v + (p && p.inv ? '/' + encodeURIComponent(p.inv) : ''); renderView(); syncNav(); window.scrollTo && $('#view') && ($('#view').scrollTop = 0); }
  function fromHash() {
    const m = (location.hash || '').replace(/^#/, '').split('/');
    const v = m[0] || 'inicio';
    if (NAV.find(n => n.id === v) || v === 'equipo') { view = v; params = m[1] ? { inv: decodeURIComponent(m[1]) } : {}; }
  }

  // ============================ VIEWS =======================================
  const VIEWS = {};

  // ---- INICIO: cola de trabajo --------------------------------------------
  VIEWS.inicio = function () {
    const S = H.getState();
    const noop = S.equipos.filter(e => e.estado === 'no_operativo');
    const st = S.equipos.filter(e => e.estado === 'en_servicio_tecnico');
    const alerta30 = S.equipos.filter(e => ['no_operativo', 'en_servicio_tecnico'].includes(e.estado) && H.diasEnEstado(e) > 30);
    const pendAct = S.pendientes.filter(p => !p.anulado && p.estado !== 'cerrado');
    const vencidos = pendAct.filter(p => p.fechaComp && p.fechaComp < H.hoyLocal());
    const conf = (S.conflictos || []).filter(c => c.estado === 'pendiente' || c.estado === 'pospuesto');
    const ciclosAb = S.ciclos.filter(c => c.estado === 'abierto');
    const borradores = S.eventos.filter(e => e.oficial !== 'Sí' && !e.anulado);
    const pendSinAsig = pendAct.filter(p => !p.ejecutor).length;

    // MP del mes (programadas / ejecutadas / pendientes) + atrasadas de meses previos
    const mpProg = S.equipos.filter(e => e.estado !== 'baja' && H.mpProgramadaEnMes(e, MESES[MONTH]));
    const mpEjec = mpProg.filter(e => H.mpDelMesEjecutada(e, YEAR, MONTH));
    const mpPend = mpProg.filter(e => H.mpEstadoMes(e, YEAR, MONTH) === 'pendiente');
    const pct = mpProg.length ? Math.round(mpEjec.length / mpProg.length * 100) : 0;
    const mpAtras = S.equipos.filter(e => e.estado !== 'baja' && [...Array(MONTH).keys()].some(m => H.mpProgramadaEnMes(e, MESES[m]) && H.mpEstadoMes(e, YEAR, m) === 'pendiente'));
    const sinProgMP = S.equipos.filter(e => H.sinProgramacionMP(e));
    const reprogPend = pendAct.filter(p => p.tipo === 'reprogramacion');
    const recordHoy = pendAct.filter(p => p.proxRecord && p.proxRecord <= H.hoyLocal());

    const alert = (cls, n, label, onclick, sub) => h('div', { class: 'alert-card ' + cls, onclick },
      h('div', { class: 'a-n' }, n), h('div', {}, h('div', { class: 'a-l' }, label), sub ? h('div', { class: 'a-l faint', style: { marginTop: '1px' } }, sub) : null));

    const root = h('div', { class: 'view-narrow' });
    root.appendChild(h('div', { class: 'alert-strip' },
      alert('hi', noop.length, 'No operativos', () => go('equipos', { estado: 'no_operativo' }), 'fuera de servicio'),
      alert('med', st.length, 'En servicio técnico', () => go('equipos', { estado: 'en_servicio_tecnico' }), 'fuera del hospital'),
      alert('hi', alerta30.length, 'Alertas >30 días', () => go('equipos', { alerta30: 1 }), 'sin avance +30d'),
      alert(vencidos.length ? 'hi' : 'med', pendAct.length, 'Pendientes', () => go('pendientes'), vencidos.length + ' vencidos · ' + pendSinAsig + ' sin asignar'),
      alert(pct >= 100 ? 'lo' : pct >= 50 ? 'med' : 'hi', pct + '%', 'MP del mes', () => go('asignaciones'), mpEjec.length + '/' + mpProg.length + ' ejecutadas'),
      alert('hi', mpAtras.length, 'MP atrasadas', () => go('equipos', { mpAtras: 1 }), 'meses previos'),
      alert('lo', ciclosAb.length, 'Ciclos abiertos', () => go('ciclos', { estado: 'abierto' }), 'correctivos en curso'),
      alert(reprogPend.length ? 'med' : 'lo', reprogPend.length, 'Reprogramaciones', () => go('pendientes', { tipo: 'reprogramacion' }), 'MP por reprogramar'),
      alert(recordHoy.length ? 'med' : 'lo', recordHoy.length, 'Recordatorios hoy', () => go('pendientes', { record: 1 }), 'seguimientos para hoy'),
      alert('lo', sinProgMP.length, 'Sin programación MP', () => go('equipos', { sinProg: 1 }), 'equipos sin MP anual'),
      alert('lo', borradores.length, 'Borradores', () => go('eventos', { oficial: 'No' }), 'sin oficializar'),
      alert('lo', conf.length, 'Conflictos', () => go('conciliacion'), 'con el maestro')
    ));

    // MP del mes — barra de cumplimiento
    const mpSec = h('div', { class: 'section' },
      h('div', { class: 's-hd' },
        h('h3', {}, `MP de ${MES_ESP(MONTH)} ${YEAR}`),
        h('span', { class: 'pill ' + (pct >= 100 ? 'op' : pct >= 50 ? 'st' : 'noop') }, pct + '% cumplido'),
        h('div', { class: 'tb-spacer' })
      ),
      h('div', { class: 's-bd' },
        h('div', { class: 'progress' }, h('i', { style: { width: pct + '%', background: pct >= 100 ? 'var(--op)' : pct >= 50 ? 'var(--st)' : 'var(--noop)' } })),
        h('div', { class: 'btn-row', style: { marginTop: '8px', fontSize: '11.5px', color: 'var(--muted)' } },
          h('span', {}, '✔ ' + mpEjec.length + ' ejecutadas'), h('span', {}, '◷ ' + mpPend.length + ' pendientes'), h('span', {}, '⚑ ' + mpAtras.length + ' atrasadas'))
      ),
      h('div', { class: 's-bd flush' }, mpPend.length ? mpMesTable(mpPend.slice(0, 12)) : h('div', { class: 'empty' }, '✓ Todas las MP del mes registradas'))
    );
    root.appendChild(mpSec);

    // Pendientes accionables
    const grp = (estado, title) => {
      const list = pendAct.filter(p => p.estado === estado).sort((a, b) => (a.fechaComp || '9999').localeCompare(b.fechaComp || '9999'));
      if (!list.length) return null;
      return h('div', {},
        h('div', { class: 'nav-group-lbl', style: { padding: '4px 0' } }, `${title} · ${list.length}`),
        h('div', { class: 'lane' }, ...list.slice(0, 12).map(p => pendCard(p)))
      );
    };
    root.appendChild(h('div', { class: 'section' },
      h('div', { class: 's-hd' }, h('h3', {}, 'Pendientes accionables'), h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm', onclick: () => go('pendientes') }, 'Ver todos'),
        h('button', { class: 'btn sm primary', onclick: () => formNuevoPendiente({}) }, svg(ic.plus, 14), 'Nuevo')),
      h('div', { class: 's-bd' }, grp('no_iniciado', 'No iniciado') || h('div', {}), grp('en_proceso', 'En proceso'),
        (!pendAct.length ? h('div', { class: 'empty' }, 'Sin pendientes activos 🎉') : null))
    ));
    return root;
  };
  function pendCard(p) {
    const venc = p.fechaComp && p.fechaComp < H.hoyLocal();
    return h('div', { class: 'wl-item ' + (venc ? 'sev-hi' : p.estado === 'en_proceso' ? 'sev-med' : ''), onclick: () => formPendiente(p) },
      h('div', { class: 'wl-acc' }),
      h('div', { class: 'wl-main' },
        h('div', { class: 'wl-title' }, (p.desc || '(sin descripción)').slice(0, 90)),
        h('div', { class: 'wl-meta' },
          h('span', { class: 'mono' }, p.inv), h('span', {}, TIPO_PENDIENTE[p.tipo] || p.tipo),
          p.ejecutor ? h('span', {}, p.ejecutor) : null,
          p.fechaComp ? h('span', { class: venc ? '' : 'faint', style: venc ? { color: 'var(--noop)' } : null }, '⏱ ' + fmtFecha(p.fechaComp)) : null)));
  }
  function mpMesTable(list) {
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'dense' },
      h('thead', {}, h('tr', {}, h('th', {}, 'N° Inv.'), h('th', {}, 'Equipo'), h('th', {}, 'Servicio'), h('th', {}, 'Estado'), h('th', {}, 'Freq'), h('th', {}, 'Encargado'), h('th', { class: 'shrink' }, ''))),
      h('tbody', {}, ...list.map(e => h('tr', {},
        h('td', { class: 'mono', onclick: () => go('equipo', { inv: e.inv }) }, e.inv),
        h('td', { onclick: () => go('equipo', { inv: e.inv }) }, e.equipo || '—'),
        h('td', { class: 'muted' }, e.servicio || '—'),
        h('td', {}, estadoPill(e.estado)),
        h('td', { class: 'muted' }, e.freq || '—'),
        h('td', { class: 'muted' }, H.encargadoDe(e) || '—'),
        h('td', {}, h('button', { class: 'btn sm', onclick: (ev) => { ev.stopPropagation(); formMP(e.inv); } }, 'MP'))
      )))));
  }

  // ---- EQUIPOS ------------------------------------------------------------
  VIEWS.equipos = function () {
    const S = H.getState();
    let f = { q: params.q || '', estado: params.estado || 'todos', servicio: params.servicio || '', fam: params.fam || '', sinEnc: false, sinProg: !!params.sinProg };
    let sortKey = 'inv', sortDir = 1;
    const eqSel = new Set();
    const servicios = [...new Set(S.equipos.map(e => e.servicio).filter(Boolean))].sort();
    const familias = [...new Set(S.equipos.map(e => e.fam).filter(Boolean))].sort();

    const tblWrap = h('div', { class: 'tbl-wrap' });
    const countNote = h('span', { class: 'count-note' });
    const bulkBar = h('div', { class: 'filterbar', style: { display: 'none', background: 'var(--accent-bg)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' } });
    function updBulk() {
      const n = eqSel.size; bulkBar.style.display = n ? '' : 'none'; if (!n) return;
      mount(bulkBar,
        h('b', {}, `${n} equipo${n !== 1 ? 's' : ''}`),
        selectEl([['', 'Asignar encargado…'], ...EJECUTORES.map(x => [x, x]), ['__none', '— quitar encargado —']], '', { onchange: e => { const v = e.target.value; if (!v) return; const val = v === '__none' ? null : v; [...eqSel].forEach(inv => { const eq = H.findEquipo(inv); if (eq) H.asignarEncargado(eq, val); }); H.save(); toast(`Encargado actualizado · ${n}`, 'success'); eqSel.clear(); render(); } }),
        h('button', { class: 'btn sm', onclick: () => exportarEquipos(data().filter(e => eqSel.has(e.inv))) }, svg(ic.dl, 14), 'Exportar selección'),
        h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm ghost', onclick: () => { eqSel.clear(); render(); } }, 'Limpiar'));
    }

    function data() {
      let list = S.equipos.slice();
      if (f.estado !== 'todos') list = list.filter(e => e.estado === f.estado);
      if (f.servicio) list = list.filter(e => e.servicio === f.servicio);
      if (f.fam) list = list.filter(e => e.fam === f.fam);
      if (f.sinEnc) list = list.filter(e => e.estado !== 'baja' && !H.encargadoDe(e));
      if (f.sinProg) list = list.filter(e => H.sinProgramacionMP(e));
      if (params.alerta30) list = list.filter(e => ['no_operativo', 'en_servicio_tecnico'].includes(e.estado) && H.diasEnEstado(e) > 30);
      if (params.mpAtras) list = list.filter(e => e.estado !== 'baja' && [...Array(MONTH).keys()].some(m => H.mpProgramadaEnMes(e, MESES[m]) && H.mpEstadoMes(e, YEAR, m) === 'pendiente'));
      if (f.q) { const q = norm(f.q); list = list.filter(e => norm(`${e.inv} ${e.equipo} ${e.serie} ${e.marca} ${e.modelo} ${e.servicio}`).includes(q)); }
      list.sort((a, b) => {
        let va, vb;
        if (sortKey === 'mp') { va = H.mpEstadoMes(a, YEAR, MONTH); vb = H.mpEstadoMes(b, YEAR, MONTH); }
        else if (sortKey === 'pend') { va = H.pendientesDe(a.inv).filter(p => p.estado !== 'cerrado').length; vb = H.pendientesDe(b.inv).filter(p => p.estado !== 'cerrado').length; }
        else { va = (a[sortKey] || ''); vb = (b[sortKey] || ''); }
        return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es', { numeric: true })) * sortDir;
      });
      return list;
    }
    function render() {
      const list = data();
      countNote.textContent = `${list.length} equipo${list.length !== 1 ? 's' : ''}`;
      const th = (key, lbl, cls) => h('th', { class: (cls || '') + ' sortable', onclick: () => { if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; } render(); } },
        lbl, sortKey === key ? h('span', { class: 'arr' }, sortDir > 0 ? '↑' : '↓') : null);
      const allChk = h('input', { type: 'checkbox', onchange: e => { if (e.target.checked) list.forEach(x => eqSel.add(x.inv)); else eqSel.clear(); render(); } });
      mount(tblWrap, h('table', { class: 'dense' },
        h('thead', {}, h('tr', {},
          h('th', { class: 'shrink' }, allChk), th('inv', 'N° Inv.'), th('equipo', 'Equipo'), th('servicio', 'Servicio'),
          th('estado', 'Estado'), th('fam', 'Familia'), th('freq', 'Freq'), th('mp', `MP ${MES_ESP(MONTH)}`), h('th', {}, 'Encargado'), th('pend', 'Pend.', 'num'))),
        h('tbody', {}, ...list.map(e => {
          const chk = h('input', { type: 'checkbox', checked: eqSel.has(e.inv) ? true : false, onclick: ev => ev.stopPropagation(), onchange: ev => { ev.target.checked ? eqSel.add(e.inv) : eqSel.delete(e.inv); tr.classList.toggle('sel', ev.target.checked); updBulk(); } });
          const tr = h('tr', { class: eqSel.has(e.inv) ? 'sel' : '', onclick: () => go('equipo', { inv: e.inv }) },
            h('td', { onclick: ev => ev.stopPropagation() }, chk),
            h('td', { class: 'mono' }, e.inv), h('td', {}, e.equipo || '—'), h('td', { class: 'muted' }, e.servicio || '—'),
            h('td', {}, estadoPill(e.estado)), h('td', { class: 'muted' }, e.fam || '—'), h('td', { class: 'muted' }, e.freq || '—'),
            h('td', {}, mpMesBadge(e)),
            h('td', { class: H.encargadoDe(e) ? 'muted' : '', style: H.encargadoDe(e) ? null : { color: 'var(--st)' } }, H.encargadoDe(e) || 'sin asignar'),
            h('td', { class: 'num' }, (() => { const n = H.pendientesDe(e.inv).filter(p => p.estado !== 'cerrado').length; return n ? h('span', { class: 'pill st' }, n) : h('span', { class: 'faint' }, '0'); })()));
          return tr;
        }))
      ));
      kbList = { rows: list.map(e => e.inv), open: inv => go('equipo', { inv }), idx: -1 };
      updBulk();
    }

    const qInput = h('input', { type: 'search', placeholder: 'Buscar inv, equipo, serie, marca…', value: f.q, oninput: e => { f.q = e.target.value; render(); } });
    const seg = h('div', { class: 'seg' }, ...[['todos', 'Todos'], ['operativo', 'Operativos'], ['no_operativo', 'No oper.'], ['en_servicio_tecnico', 'Serv. téc.'], ['baja', 'Baja']].map(([v, l]) =>
      h('button', { class: f.estado === v ? 'on' : '', onclick: e => { f.estado = v; [...seg.children].forEach(b => b.classList.remove('on')); e.target.classList.add('on'); render(); } }, l)));

    const chips = [];
    if (params.alerta30) chips.push('Alerta >30 días');
    if (params.mpAtras) chips.push('MP atrasadas');
    if (params.sinProg) chips.push('Sin programación MP');
    const incomingChip = chips.length ? h('span', { class: 'chip', style: { color: 'var(--noop)' } }, h('b', {}, chips.join(' · ')), h('span', { class: 'x', onclick: () => go('equipos', {}) }, '×')) : null;
    const root = h('div', {},
      h('div', { class: 'filterbar' }, qInput, seg,
        field(null, selectEl([['', 'Todo servicio'], ...servicios.map(s => [s, s])], f.servicio, { onchange: e => { f.servicio = e.target.value; render(); } })),
        field(null, selectEl([['', 'Toda familia'], ...familias.map(s => [s, s])], f.fam, { onchange: e => { f.fam = e.target.value; render(); } })),
        h('label', { class: 'checkbox' }, h('input', { type: 'checkbox', onchange: e => { f.sinEnc = e.target.checked; render(); } }), 'Sin encargado'),
        h('label', { class: 'checkbox' }, h('input', { type: 'checkbox', checked: f.sinProg ? true : false, onchange: e => { f.sinProg = e.target.checked; render(); } }), 'Sin prog. MP'),
        h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm', onclick: () => exportarEquipos(data()) }, svg(ic.dl, 14), 'Exportar'),
        incomingChip, countNote),
      bulkBar, tblWrap);
    render();
    return root;
  };
  function exportarEquipos(list) {
    const estLbl = { ejecutada: 'Ejecutada', reprogramada: 'Reprogramada', otro: 'Otro', pendiente: 'Pendiente' };
    const header = ['N° Inv.', 'Equipo', 'Servicio', 'Unidad', 'Familia', 'Marca', 'Modelo', 'Serie', 'Freq MP', 'Estado', 'Días', 'Encargado', 'Pend. abiertos', `MP ${MES_ESP(MONTH)}`];
    const rows = list.map(e => [e.inv, e.equipo || '', e.servicio || '', e.unidad || '', e.fam || '', e.marca || '', e.modelo || '', e.serie || '', e.freq || '', ESTADO_LABEL[e.estado] || e.estado, H.diasEnEstado(e), H.encargadoDe(e) || '', H.pendientesDe(e.inv).filter(p => p.estado !== 'cerrado').length, estLbl[H.mpEstadoMes(e, YEAR, MONTH)] || '']);
    exportTablaExcel('Equipos', 'Equipos (vista filtrada) · ' + H.hoyLocal(), header, rows, `SIGEM_equipos_${H.hoyLocal()}.xlsx`);
  }
  function mpMesBadge(e) {
    if (e.estado === 'baja') return h('span', { class: 'faint' }, '—');
    const prog = H.mpProgramadaEnMes(e, MESES[MONTH]);
    const st = H.mpEstadoMes(e, YEAR, MONTH);
    if (st === 'ejecutada') return h('span', { class: 'pill op' }, '✓ Hecha');
    if (st === 'reprogramada') return h('span', { class: 'pill st' }, 'Reprog.');
    if (st === 'otro') return h('span', { class: 'pill noop' }, 'Falla');
    return prog ? h('span', { class: 'pill noop' }, 'Pendiente') : h('span', { class: 'faint' }, 'No prog.');
  }

  // ---- EQUIPO (detalle) ---------------------------------------------------
  VIEWS.equipo = function () {
    const eq = H.findEquipo(params.inv);
    if (!eq) return h('div', { class: 'empty' }, 'Equipo no encontrado · ', h('span', { class: 'link', onclick: () => go('equipos') }, 'volver'));
    const tab = params.tab || 'resumen';
    const confs = H.conflictosDe(eq.inv);
    const pends = H.pendientesDe(eq.inv).filter(p => p.estado !== 'cerrado');

    const head = h('div', { class: 'eq-head' },
      h('div', { style: { flex: 1 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' } },
          h('span', { class: 'eq-id mono' }, eq.inv), h('span', { class: 'eq-name' }, eq.equipo || '—'), estadoPill(eq.estado),
          eq.estadoDesde ? h('span', { class: 'faint', style: { fontSize: '11.5px' } }, `· ${H.diasEnEstado(eq)} día(s) en estado`) : null),
        h('div', { class: 'kv-grid', style: { marginTop: '12px' } }, ...[
          ['N° Carpeta', eq.carpeta], ['Serie', eq.serie], ['Familia', eq.fam], ['Marca', eq.marca], ['Modelo', eq.modelo],
          ['Servicio', eq.servicio], ['Unidad', eq.unidad], ['Ubicación', eq.ubic], ['Frecuencia MP', eq.freq],
          ['Procedencia', eq.proc], ['Año', eq.ano], ['VUR', eq.vur], ['Clasificación', eq.clasif], ['Encargado', H.encargadoDe(eq)]
        ].map(([k, v]) => h('div', { class: 'kv' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v == null || v === '' ? '—' : String(v)))))),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary sm', onclick: () => formNuevoEvento({ inv: eq.inv }) }, svg(ic.plus, 14), 'Nuevo evento'),
        h('button', { class: 'btn sm', onclick: () => formNuevoPendiente({ inv: eq.inv }) }, 'Pendiente'),
        h('button', { class: 'btn sm', onclick: () => formAsignarEncargado(eq) }, 'Encargado'),
        eq.estado !== 'baja' ? h('button', { class: 'btn sm danger', onclick: () => formBaja(eq) }, 'Dar de baja') : null));

    const tabsDef = [['resumen', 'Resumen'], ['matriz', 'Matriz MP'], ['bitacora', 'Bitácora'], ['ciclos', 'Ciclos'], ['pendientes', 'Pendientes', pends.length], ['conflictos', 'Conflictos', confs.length], ['auditoria', 'Auditoría']];
    const tabs = h('div', { class: 'tabs' }, ...tabsDef.map(([id, lbl, n]) =>
      h('button', { class: tab === id ? 'on' : '', onclick: () => go('equipo', { inv: eq.inv, tab: id }) }, lbl, n ? h('span', { class: 'badge-count' }, n) : null)));

    const body = h('div', {});
    if (tab === 'resumen') mount(body, tabResumen(eq));
    else if (tab === 'matriz') mount(body, tabMatriz(eq));
    else if (tab === 'bitacora') mount(body, tabBitacora(eq));
    else if (tab === 'ciclos') mount(body, tabCiclos(eq));
    else if (tab === 'pendientes') mount(body, tabPendientes(eq));
    else if (tab === 'conflictos') mount(body, tabConflictos(eq));
    else if (tab === 'auditoria') mount(body, tabAuditoria(eq));

    const dias = H.diasEnEstado(eq);
    const banner = (eq.estado !== 'operativo' && eq.estado !== 'baja' && eq.estado !== 'desconocido')
      ? h('div', { class: 'notice ' + (dias > 30 ? 'warn' : 'info'), style: { marginBottom: '12px' } },
        `Estado: ${ESTADO_LABEL[eq.estado]} hace ${dias} día(s). Encargado: ${H.encargadoDe(eq) || '—'}.` + (dias > 30 ? ' ⚠ Sin avance hace más de 30 días.' : ''))
      : null;
    return h('div', { class: 'view-narrow' },
      h('div', { class: 'tb-title', style: { marginBottom: '10px', fontSize: '12px' } },
        h('span', { class: 'link', onclick: () => go('equipos') }, '← Equipos')),
      head, banner, tabs, body);
  };
  function tabResumen(eq) {
    const evs = H.eventosDe(eq.inv).slice(-6).reverse();
    const ciclosAb = H.ciclosAbiertosDe(eq.inv);
    return h('div', { class: 'hsplit', style: { flexWrap: 'wrap' } },
      h('div', { class: 'section', style: { flex: '1', minWidth: '320px' } },
        h('div', { class: 's-hd' }, h('h3', {}, 'Últimos eventos')),
        h('div', { class: 's-bd flush' }, evs.length ? eventosTable(evs, true) : h('div', { class: 'empty' }, 'Sin eventos'))),
      h('div', { style: { width: '280px', flex: '0 0 auto' } },
        h('div', { class: 'section' }, h('div', { class: 's-hd' }, h('h3', {}, 'Ciclo correctivo')),
          h('div', { class: 's-bd' }, ciclosAb.length
            ? h('div', {}, h('div', { class: 'mono' }, ciclosAb[0].folio), h('div', { class: 'faint', style: { fontSize: '11.5px', marginTop: '4px' } }, 'Abierto desde ' + fmtFecha(ciclosAb[0].fechaApertura)),
              h('button', { class: 'btn sm', style: { marginTop: '9px' }, onclick: () => { const m = window.prompt('Justificación del cierre manual:'); if (m) { H.cerrarCicloManual(ciclosAb[0], m); } } }, 'Cerrar ciclo'))
            : h('div', { class: 'faint' }, 'Sin ciclo abierto'))),
        h('div', { class: 'section' }, h('div', { class: 's-hd' }, h('h3', {}, `MP ${YEAR}`)),
          h('div', { class: 's-bd' }, miniGantt(eq, YEAR))),
        notasPanel(eq)));
  }
  function notasPanel(eq) {
    const box = h('div', {});
    const render = () => {
      const ns = H.notasDe(eq).slice().reverse();
      mount(box, ns.length ? h('div', { class: 'row-list' }, ...ns.map(n => h('div', { class: 'mini-row', style: { display: 'block' } },
        h('div', { class: 'm-meta' }, h('b', {}, n.autor), ' · ', fmtFecha(n.fecha)), h('div', { class: 'm-txt' }, n.texto)))) : h('div', { class: 'faint', style: { fontSize: '11.5px' } }, 'Sin notas.'));
    };
    render();
    const input = h('input', { type: 'text', placeholder: 'Agregar nota + Enter', onkeydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { H.agregarNotaEquipo(eq, e.target.value); H.save(); e.target.value = ''; render(); } } });
    return h('div', { class: 'section' }, h('div', { class: 's-hd' }, h('h3', {}, 'Notas del equipo'), h('span', { class: 's-sub' }, H.notasDe(eq).length || '')),
      h('div', { class: 's-bd' }, box, h('div', { style: { marginTop: '7px' } }, input)));
  }
  function tabMatriz(eq) {
    const yearSel = selectEl([YEAR + 1, YEAR, YEAR - 1, YEAR - 2].map(y => [y, y]), params.year || YEAR, { onchange: e => { params.year = +e.target.value; mount($('#view'), VIEWS.equipo()); } });
    const yr = params.year || YEAR;
    return h('div', { class: 'section' },
      h('div', { class: 's-hd' }, h('h3', {}, 'Matriz de mantención preventiva'), h('div', { class: 'tb-spacer' }), field(null, yearSel)),
      h('div', { class: 's-bd flush' }, h('div', { class: 'tbl-wrap' }, h('table', { class: 'dense' },
        h('thead', {}, h('tr', {}, h('th', {}, ''), ...MESES.map(m => h('th', { class: 'num' }, m)))),
        h('tbody', {},
          h('tr', {}, h('td', { class: 'muted' }, 'Programado (P)'), ...MESES.map(m => { const p = (eq.prog || {})[m]; return h('td', { class: 'num mpcell ' + (p ? 'x' : '') }, p || '·'); })),
          h('tr', {}, h('td', { class: 'muted' }, 'Resultado (R)'), ...MESES.map((m, i) => {
            const r = H.resultadoMPMes(eq, yr, i);
            return h('td', { class: 'num mpcell ' + mpResultClass(r), onclick: () => formMP(eq.inv, `${yr}-${String(i + 1).padStart(2, '0')}-05`) }, r || '·');
          }))
      )))),
      h('div', { class: 's-bd' }, h('div', { class: 'faint', style: { fontSize: '11.5px' } }, 'Click en una celda de Resultado para registrar/editar la MP de ese mes. Códigos: Si=hecha · C1–C8=reprogramación · FS/NU/No=falla · Baja.')));
  }
  function miniGantt(eq, yr) {
    return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: '3px' } }, ...MESES.map((m, i) => {
      const r = H.resultadoMPMes(eq, yr, i); const prog = H.mpProgramadaEnMes(eq, m);
      const cls = r ? mpResultClass(r) : '';
      return h('div', { title: `${m}: ${r || (prog ? 'programado' : '—')}`, style: { textAlign: 'center', fontSize: '9px', padding: '5px 0', borderRadius: '4px', fontWeight: 600, background: 'var(--surface-2)', border: '1px solid var(--border)', color: cls === 'ok' ? 'var(--op)' : cls === 're' ? 'var(--st)' : cls === 'bad' ? 'var(--noop)' : prog ? 'var(--accent)' : 'var(--faint)' } }, m[0]);
    }));
  }
  function tabBitacora(eq) {
    const evs = H.eventosDeTodos(eq.inv).reverse();
    return h('div', { class: 'section' }, h('div', { class: 's-hd' }, h('h3', {}, 'Bitácora completa'), h('span', { class: 's-sub' }, `${evs.length} eventos`)),
      h('div', { class: 's-bd flush' }, evs.length ? eventosTable(evs, true) : h('div', { class: 'empty' }, 'Sin eventos')));
  }
  function tabCiclos(eq) {
    const cs = H.ciclosDe(eq.inv);
    return h('div', { class: 'section' }, h('div', { class: 's-hd' }, h('h3', {}, 'Ciclos correctivos')),
      h('div', { class: 's-bd flush' }, cs.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'dense' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Folio'), h('th', {}, 'Apertura'), h('th', {}, 'Cierre'), h('th', {}, 'Estado'), h('th', {}, 'Ingeniero'))),
        h('tbody', {}, ...cs.map(c => h('tr', {}, h('td', { class: 'mono' }, c.folio), h('td', {}, fmtFecha(c.fechaApertura)), h('td', {}, c.fechaCierre ? fmtFecha(c.fechaCierre) : '—'),
          h('td', {}, h('span', { class: 'pill ' + (c.estado === 'abierto' ? 'st' : c.estado === 'anulado' ? 'baja' : 'op') }, c.estado)), h('td', { class: 'muted' }, c.ingenieroAsignado || '—')))))) : h('div', { class: 'empty' }, 'Sin ciclos')));
  }
  function tabPendientes(eq) {
    const ps = H.pendientesDe(eq.inv);
    return h('div', { class: 'section' }, h('div', { class: 's-hd' }, h('h3', {}, 'Pendientes'), h('div', { class: 'tb-spacer' }), h('button', { class: 'btn sm primary', onclick: () => formNuevoPendiente({ inv: eq.inv }) }, svg(ic.plus, 14), 'Nuevo')),
      h('div', { class: 's-bd flush' }, ps.length ? pendientesTable(ps) : h('div', { class: 'empty' }, 'Sin pendientes')));
  }
  function tabConflictos(eq) {
    const cs = H.conflictosDe(eq.inv);
    if (!cs.length) return h('div', { class: 'empty' }, 'Sin conflictos pendientes con el maestro');
    return h('div', { class: 'row-list' }, ...cs.map(c => conflictoRow(c)));
  }
  // Reúne las entradas de auditoría que afectan a un equipo (equipo + sus eventos,
  // pendientes, tareas y ciclos) y las muestra como historial de cambios.
  function auditoriaDe(eq) {
    const S = H.getState();
    const evIds = new Set(S.eventos.filter(e => e.inv === eq.inv).map(e => e.id));
    const pendIds = new Set(S.pendientes.filter(p => p.inv === eq.inv).map(p => p.id));
    const tareaIds = new Set(S.tareas.filter(t => pendIds.has(t.pendId)).map(t => t.id));
    const folios = new Set(S.ciclos.filter(c => c.inv === eq.inv).map(c => c.folio));
    return (S.audit || []).filter(a =>
      (a.entidad === 'equipo' && a.idEnt === eq.inv) ||
      (a.entidad === 'evento' && evIds.has(a.idEnt)) ||
      (a.entidad === 'pendiente' && pendIds.has(a.idEnt)) ||
      (a.entidad === 'tarea' && tareaIds.has(a.idEnt)) ||
      (a.entidad === 'ciclo' && folios.has(a.idEnt))
    ).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  }
  function tabAuditoria(eq) {
    const all = auditoriaDe(eq);
    const ENT = { equipo: 'Equipo', evento: 'Evento', pendiente: 'Pendiente', tarea: 'Tarea', ciclo: 'Ciclo' };
    const fhora = ts => { if (!ts) return '—'; const d = new Date(ts); return isNaN(d) ? ts : d.toLocaleString('es-CL'); };
    const v = x => (x === null || x === undefined || x === '') ? '—' : (x === false ? 'No' : x === true ? 'Sí' : String(x));
    let desde = '', hasta = '';
    const body = h('div', { class: 's-bd flush' }); const cnt = h('span', { class: 's-sub' });
    function render() {
      const list = all.filter(a => { const d = (a.ts || '').slice(0, 10); return (!desde || d >= desde) && (!hasta || d <= hasta); });
      cnt.textContent = `${list.length} registro(s)`;
      mount(body, list.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'dense' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Fecha / hora'), h('th', {}, 'Entidad'), h('th', {}, 'Campo'), h('th', {}, 'Antes'), h('th', {}, 'Después'), h('th', {}, 'Usuario'))),
        h('tbody', {}, ...list.slice(0, 500).map(a => h('tr', {},
          h('td', { class: 'muted' }, fhora(a.ts)), h('td', {}, h('span', { class: 'tag' }, ENT[a.entidad] || a.entidad)),
          h('td', {}, a.campo || '—'), h('td', { class: 'muted' }, v(a.valorAnterior)), h('td', {}, v(a.valorNuevo)), h('td', { class: 'muted' }, a.usuario || '—')))))) : h('div', { class: 'empty' }, 'Sin cambios en el rango'));
    }
    render();
    return h('div', { class: 'section' },
      h('div', { class: 's-hd' }, h('h3', {}, 'Historial de cambios'), cnt, h('div', { class: 'tb-spacer' }),
        h('span', { class: 'faint', style: { fontSize: '11px' } }, 'Desde'), h('input', { type: 'date', style: { width: 'auto' }, onchange: e => { desde = e.target.value; render(); } }),
        h('span', { class: 'faint', style: { fontSize: '11px' } }, 'Hasta'), h('input', { type: 'date', style: { width: 'auto' }, onchange: e => { hasta = e.target.value; render(); } })),
      body);
  }

  // ---- PENDIENTES ---------------------------------------------------------
  let pendSel = new Set();
  VIEWS.pendientes = function () {
    const S = H.getState();
    let f = { estado: params.vencidos ? 'activos' : (params.estado || 'activos'), tipo: params.tipo || '', q: '', serv: '', ejec: params.ejec || '', record: !!params.record };
    pendSel = new Set();
    const servicios = [...new Set(S.pendientes.map(p => p.servicio).filter(Boolean))].sort();
    const wrap = h('div', { class: 'tbl-wrap' }); const note = h('span', { class: 'count-note' });
    const cargaBox = h('div', {}); const bulkBar = h('div', { class: 'filterbar', style: { display: 'none', background: 'var(--accent-bg)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' } });

    // Conjunto base (estado/vencidos/tipo/servicio) sin el filtro de responsable — para la carga.
    function base() {
      let list = S.pendientes.filter(p => !p.anulado);
      if (f.estado === 'activos') list = list.filter(p => p.estado !== 'cerrado');
      else if (f.estado !== 'todos') list = list.filter(p => p.estado === f.estado);
      if (params.vencidos) list = list.filter(p => p.fechaComp && p.fechaComp < H.hoyLocal() && p.estado !== 'cerrado');
      if (f.tipo) list = list.filter(p => p.tipo === f.tipo);
      if (f.serv) list = list.filter(p => p.servicio === f.serv);
      return list;
    }
    function data() {
      let list = base();
      if (f.ejec === '__none') list = list.filter(p => !p.ejecutor);
      else if (f.ejec) list = list.filter(p => p.ejecutor === f.ejec);
      if (f.record) list = list.filter(p => p.proxRecord && p.proxRecord <= H.hoyLocal() && p.estado !== 'cerrado');
      if (f.q) { const q = norm(f.q); list = list.filter(p => norm(`${p.inv} ${p.equipo} ${p.desc} ${p.ejecutor}`).includes(q)); }
      // Orden: más atrasados primero (compromiso ascendente; sin fecha al final).
      return list.sort((a, b) => (a.fechaComp || '9999').localeCompare(b.fechaComp || '9999'));
    }
    function renderCarga() {
      const set = base(); const counts = {}; let sin = 0;
      set.forEach(p => { if (p.ejecutor) counts[p.ejecutor] = (counts[p.ejecutor] || 0) + 1; else sin++; });
      const chip = (lbl, n, key, alarm) => h('span', { class: 'chip', style: { cursor: 'pointer', ...(f.ejec === key ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }, onclick: () => { f.ejec = f.ejec === key ? '' : key; render(); } }, lbl, ' ', h('b', { style: alarm ? { color: 'var(--st)' } : null }, n));
      const items = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([ej, n]) => chip(ej, n, ej));
      mount(cargaBox, h('div', { class: 'section', style: { marginBottom: '10px' } },
        h('div', { class: 's-hd' }, h('h3', {}, 'Carga por responsable'), h('span', { class: 's-sub' }, set.length + ' pendiente(s)')),
        h('div', { class: 's-bd', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          sin ? chip('Sin asignar', sin, '__none', true) : null, ...items, (items.length || sin) ? null : h('span', { class: 'faint' }, 'Sin pendientes'))));
    }
    function updBulk() {
      const n = pendSel.size; bulkBar.style.display = n ? '' : 'none'; if (!n) return;
      const sel = () => [...pendSel].map(id => S.pendientes.find(p => p.id === id)).filter(Boolean);
      mount(bulkBar,
        h('b', {}, `${n} seleccionado${n !== 1 ? 's' : ''}`),
        selectEl([['', 'Asignar responsable…'], ...EJECUTORES.map(x => [x, x]), ['__none', '— quitar responsable —']], '', { onchange: e => { const v = e.target.value; if (!v) return; const val = v === '__none' ? null : v; sel().forEach(p => { const o = p.ejecutor || null; p.ejecutor = val; H.audit('pendiente', p.id, 'ejecutor', o, val); }); H.save(); toast(`Responsable actualizado · ${n}`, 'success'); pendSel.clear(); render(); } }),
        h('button', { class: 'btn sm', onclick: () => { sel().forEach(p => { if (p.estado === 'no_iniciado') { p.estado = 'en_proceso'; H.audit('pendiente', p.id, 'estado', 'no_iniciado', 'en_proceso'); } }); H.save(); toast('Marcados en proceso', 'success'); pendSel.clear(); render(); } }, 'Marcar en proceso'),
        h('button', { class: 'btn sm', onclick: () => { if (!window.confirm(`¿Resolver ${n} pendiente(s)?`)) return; sel().forEach(p => { if (p.estado !== 'cerrado') { p.estado = 'cerrado'; if (!p.fechaCierre) p.fechaCierre = H.hoyLocal(); H.audit('pendiente', p.id, 'estado', 'abierto', 'cerrado'); } }); H.save(); toast('Resueltos', 'success'); pendSel.clear(); render(); } }, 'Resolver'),
        h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm ghost', onclick: () => { pendSel.clear(); render(); } }, 'Limpiar selección'));
    }
    function render() {
      renderCarga();
      const list = data();
      note.textContent = `${list.length} pendiente${list.length !== 1 ? 's' : ''}`;
      mount(wrap, list.length ? pendientesTable(list, { sel: pendSel, onToggle: updBulk, onAll: render }) : h('div', { class: 'empty' }, 'Sin resultados'));
      kbList = { rows: list.map(p => p.id), open: id => formPendiente(S.pendientes.find(p => p.id === id)), idx: -1 };
      updBulk();
    }
    const seg = h('div', { class: 'seg' }, ...[['activos', 'Activos'], ['no_iniciado', 'No iniciado'], ['en_proceso', 'En proceso'], ['cerrado', 'Resueltos'], ['todos', 'Todos']].map(([v, l]) =>
      h('button', { class: f.estado === v ? 'on' : '', onclick: e => { f.estado = v; params.vencidos = 0; [...seg.children].forEach(b => b.classList.remove('on')); e.target.classList.add('on'); render(); } }, l)));
    const presetChip = (params.tipo === 'reprogramacion' || params.record)
      ? h('span', { class: 'chip', style: { color: 'var(--accent)', borderColor: 'var(--accent)' } }, h('b', {}, params.record ? 'Recordatorios para hoy' : 'Reprogramaciones MP'), h('span', { class: 'x', onclick: () => go('pendientes', {}) }, '×')) : null;
    const root = h('div', {},
      h('div', { class: 'filterbar' },
        h('input', { type: 'search', placeholder: 'Buscar…', oninput: e => { f.q = e.target.value; render(); } }), seg,
        selectEl([['', 'Todo tipo'], ...Object.entries(TIPO_PENDIENTE)], f.tipo, { onchange: e => { f.tipo = e.target.value; render(); } }),
        selectEl([['', 'Todo servicio'], ...servicios.map(s => [s, s])], f.serv, { onchange: e => { f.serv = e.target.value; render(); } }),
        selectEl([['', 'Todo responsable'], ['__none', 'Sin asignar'], ...EJECUTORES.map(x => [x, x])], f.ejec, { onchange: e => { f.ejec = e.target.value; render(); } }),
        h('label', { class: 'checkbox' }, h('input', { type: 'checkbox', checked: params.vencidos ? true : false, onchange: e => { params.vencidos = e.target.checked ? 1 : 0; render(); } }), 'Solo vencidos'),
        h('label', { class: 'checkbox' }, h('input', { type: 'checkbox', checked: f.record ? true : false, onchange: e => { f.record = e.target.checked; render(); } }), 'Recordatorio ≤ hoy'),
        presetChip,
        h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm', onclick: () => exportarPendientes(data()) }, svg(ic.dl, 14), 'Exportar'),
        h('button', { class: 'btn sm primary', onclick: () => formNuevoPendiente({}) }, svg(ic.plus, 14), 'Nuevo'), note),
      cargaBox, bulkBar, wrap);
    render(); return root;
  };
  function exportarPendientes(list) {
    const header = ['ID', 'N° Inv.', 'Equipo', 'Servicio', 'Tipo', 'Descripción', 'Responsable', 'Estado', 'Creado', 'Compromiso', 'Atraso (días)', 'Próx. recordatorio'];
    const rows = list.map(p => { const at = p.fechaComp && p.estado !== 'cerrado' ? H.diasEntreFechas(p.fechaComp, H.hoyLocal()) : ''; return [p.id, p.inv, p.equipo || '', p.servicio || '', TIPO_PENDIENTE[p.tipo] || p.tipo, p.desc || '', p.ejecutor || '', ESTADO_PEND_LABEL[p.estado] || p.estado, fmtFecha(p.fechaCrea), fmtFecha(p.fechaComp), (at !== '' && at > 0 ? at : ''), fmtFecha(p.proxRecord)]; });
    exportTablaExcel('Pendientes', 'Pendientes (vista filtrada) · ' + H.hoyLocal(), header, rows, `SIGEM_pendientes_${H.hoyLocal()}.xlsx`);
  }
  function pendientesTable(list, opts) {
    opts = opts || {}; const sel = opts.sel;
    const headChk = sel ? h('th', { class: 'shrink' }, h('input', { type: 'checkbox', onchange: e => { if (e.target.checked) list.forEach(p => sel.add(p.id)); else list.forEach(p => sel.delete(p.id)); opts.onAll && opts.onAll(); } })) : null;
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'dense' },
      h('thead', {}, h('tr', {}, headChk, h('th', {}, 'N° Inv.'), h('th', {}, 'Equipo'), h('th', {}, 'Tipo'), h('th', {}, 'Descripción'), h('th', {}, 'Estado'), h('th', {}, 'Responsable'), h('th', {}, 'Compromiso'), h('th', { class: 'num' }, 'Atraso'), h('th', {}, 'Recordatorio'))),
      h('tbody', {}, ...list.map(p => {
        const venc = p.fechaComp && p.fechaComp < H.hoyLocal() && p.estado !== 'cerrado';
        const atraso = p.fechaComp && p.estado !== 'cerrado' ? H.diasEntreFechas(p.fechaComp, H.hoyLocal()) : null;
        const recVenc = p.proxRecord && p.proxRecord <= H.hoyLocal() && p.estado !== 'cerrado';
        const chk = sel ? h('td', { onclick: ev => ev.stopPropagation() }, h('input', { type: 'checkbox', checked: sel.has(p.id) ? true : false, onchange: ev => { ev.target.checked ? sel.add(p.id) : sel.delete(p.id); tr.classList.toggle('sel', ev.target.checked); opts.onToggle && opts.onToggle(); } })) : null;
        const tr = h('tr', { class: sel && sel.has(p.id) ? 'sel' : '', onclick: () => formPendiente(p) },
          chk,
          h('td', { class: 'mono' }, p.inv), h('td', {}, p.equipo || '—'), h('td', { class: 'muted' }, TIPO_PENDIENTE[p.tipo] || p.tipo),
          h('td', { class: 'wrap' }, (p.desc || '—')), h('td', {}, pendPill(p.estado)),
          h('td', { class: p.ejecutor ? 'muted' : '', style: p.ejecutor ? null : { color: 'var(--st)' } }, p.ejecutor || 'sin asignar'),
          h('td', { class: venc ? '' : 'muted', style: venc ? { color: 'var(--noop)', fontWeight: 600 } : null }, p.fechaComp ? fmtFecha(p.fechaComp) : '—'),
          h('td', { class: 'num' }, atraso != null && atraso > 0 ? h('span', { class: 'pill noop' }, '+' + atraso + ' d') : (atraso != null ? h('span', { class: 'faint' }, atraso + ' d') : h('span', { class: 'faint' }, '—'))),
          h('td', { class: recVenc ? '' : 'muted', style: recVenc ? { color: 'var(--st)', fontWeight: 600 } : null }, p.proxRecord ? fmtFecha(p.proxRecord) : '—'));
        return tr;
      }))));
  }

  // ---- CICLOS -------------------------------------------------------------
  VIEWS.ciclos = function () {
    const S = H.getState();
    let estado = params.estado || 'abierto';
    const wrap = h('div', { class: 'tbl-wrap' });
    function render() {
      let list = S.ciclos.slice().reverse();
      if (estado !== 'todos') list = list.filter(c => c.estado === estado);
      mount(wrap, list.length ? h('table', { class: 'dense' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Folio'), h('th', {}, 'N° Inv.'), h('th', {}, 'Equipo'), h('th', {}, 'Apertura'), h('th', {}, 'Cierre'), h('th', {}, 'Estado'), h('th', {}, 'Ingeniero'))),
        h('tbody', {}, ...list.map(c => { const eq = H.findEquipo(c.inv) || {}; return h('tr', { onclick: () => go('equipo', { inv: c.inv, tab: 'ciclos' }) },
          h('td', { class: 'mono' }, c.folio), h('td', { class: 'mono' }, c.inv), h('td', {}, eq.equipo || '—'), h('td', {}, fmtFecha(c.fechaApertura)),
          h('td', {}, c.fechaCierre ? fmtFecha(c.fechaCierre) : '—'), h('td', {}, h('span', { class: 'pill ' + (c.estado === 'abierto' ? 'st' : c.estado === 'anulado' ? 'baja' : 'op') }, c.estado)), h('td', { class: 'muted' }, c.ingenieroAsignado || '—')); }))
      ) : h('div', { class: 'empty' }, 'Sin ciclos'));
    }
    const seg = h('div', { class: 'seg' }, ...[['abierto', 'Abiertos'], ['cerrado', 'Cerrados'], ['anulado', 'Anulados'], ['todos', 'Todos']].map(([v, l]) =>
      h('button', { class: estado === v ? 'on' : '', onclick: e => { estado = v; [...seg.children].forEach(b => b.classList.remove('on')); e.target.classList.add('on'); render(); } }, l)));
    render(); return h('div', {}, h('div', { class: 'filterbar' }, seg), wrap);
  };

  // ---- EVENTOS (bitácora global) ------------------------------------------
  VIEWS.eventos = function () {
    const S = H.getState();
    let f = { tipo: '', oficial: params.oficial === 'No' ? 'no' : params.oficial === 'Sí' ? 'si' : '', q: '', anulados: false, ejec: params.ejec || '', desde: '', hasta: '' };
    const wrap = h('div', { class: 'tbl-wrap' }); const note = h('span', { class: 'count-note' });
    const tipos = [...new Set(S.eventos.map(e => e.tipo))];
    function data() {
      let list = S.eventos.slice();
      if (!f.anulados) list = list.filter(e => !e.anulado);
      if (f.tipo) list = list.filter(e => e.tipo === f.tipo);
      if (f.oficial) list = list.filter(e => (e.oficial === 'Sí') === (f.oficial === 'si'));
      if (f.ejec) list = list.filter(e => (f.ejec === '__none' ? !e.ejecutor : e.ejecutor === f.ejec));
      if (f.desde) list = list.filter(e => e.fecha && e.fecha >= f.desde);
      if (f.hasta) list = list.filter(e => e.fecha && e.fecha <= f.hasta);
      if (f.q) { const q = norm(f.q); list = list.filter(e => norm(`${e.inv} ${e.equipo} ${e.ejecutor} ${e.folio} ${e.obs}`).includes(q)); }
      return list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 600);
    }
    function render() { const list = data(); note.textContent = `${list.length}`; mount(wrap, eventosTable(list, false)); }
    const root = h('div', {},
      h('div', { class: 'filterbar' },
        h('input', { type: 'search', placeholder: 'Buscar inv, ejecutor, folio…', oninput: e => { f.q = e.target.value; render(); } }),
        selectEl([['', 'Todo tipo'], ...tipos.map(t => [t, t])], '', { onchange: e => { f.tipo = e.target.value; render(); } }),
        selectEl([['', 'Oficial: todos'], ['si', 'Sólo oficiales'], ['no', 'Sólo borradores']], f.oficial, { onchange: e => { f.oficial = e.target.value; render(); } }),
        selectEl([['', 'Todo ejecutor'], ['__none', 'Sin ejecutor'], ...EJECUTORES.map(x => [x, x])], f.ejec, { onchange: e => { f.ejec = e.target.value; render(); } }),
        h('span', { class: 'faint', style: { fontSize: '11px' } }, 'Desde'), h('input', { type: 'date', style: { width: 'auto' }, onchange: e => { f.desde = e.target.value; render(); } }),
        h('span', { class: 'faint', style: { fontSize: '11px' } }, 'Hasta'), h('input', { type: 'date', style: { width: 'auto' }, onchange: e => { f.hasta = e.target.value; render(); } }),
        h('label', { class: 'checkbox' }, h('input', { type: 'checkbox', onchange: e => { f.anulados = e.target.checked; render(); } }), 'Ver anulados'),
        h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm', onclick: () => { const list = data(); exportTablaExcel('Bitácora', 'Bitácora (vista filtrada) · ' + H.hoyLocal(), ['Fecha', 'N° Inv.', 'Equipo', 'Tipo', 'Resultado', 'Estado', 'Ejecutor', 'Folio', 'Oficial', 'Observación'], list.map(e => [fmtFecha(e.fecha), e.inv, e.equipo || '', H.etiquetaTipoEvento(e), e.resultado || '', e.estado || '', e.ejecutor || '', e.folio || '', e.oficial || 'No', e.obs || '']), `SIGEM_bitacora_${H.hoyLocal()}.xlsx`); } }, svg(ic.dl, 14), 'Exportar'),
        h('button', { class: 'btn sm primary', onclick: () => formNuevoEvento({}) }, svg(ic.plus, 14), 'Nuevo evento'), note),
      wrap);
    render(); return root;
  };
  function eventosTable(list, compact) {
    return h('div', { class: 'tbl-wrap' }, h('table', { class: 'dense' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Fecha'), !compact ? h('th', {}, 'N° Inv.') : null, h('th', {}, 'Tipo'), h('th', {}, 'Resultado'), h('th', {}, 'Estado'), h('th', {}, 'Ejecutor'), h('th', {}, 'Folio'), h('th', {}, ''), h('th', { class: 'shrink' }, ''))),
      h('tbody', {}, ...list.map(e => h('tr', { class: e.anulado ? '' : '', style: e.anulado ? { opacity: .5 } : null },
        h('td', {}, fmtFecha(e.fecha)),
        !compact ? h('td', { class: 'mono link', onclick: () => go('equipo', { inv: e.inv }) }, e.inv) : null,
        h('td', {}, H.etiquetaTipoEvento(e)), h('td', { class: 'mono' }, e.resultado || '—'),
        h('td', {}, e.estado ? estadoPill(e.estado.replace(/ /g, '_').replace('en_servicio_técnico', 'en_servicio_tecnico')) : '—'),
        h('td', { class: 'muted' }, e.ejecutor || '—'), h('td', { class: 'mono faint' }, e.folio || '—'),
        h('td', {}, e.oficial === 'Sí' ? h('span', { class: 'tag oficial' }, 'Oficial') : h('span', { class: 'tag' }, 'Borrador')),
        h('td', {}, e.anulado ? h('span', { class: 'faint', title: e.motivoAnulacion }, 'anulado') : eventMenu(e))
      )))));
  }
  function eventMenu(e) {
    return h('button', { class: 'btn icon ghost sm', title: 'Acciones', onclick: ev => { ev.stopPropagation(); evActions(e, ev.currentTarget); } }, svg(ic.dots, 15));
  }
  function evActions(e, anchor) {
    const items = [];
    if (e.oficial !== 'Sí') items.push(['Oficializar', () => { H.oficializarEvento(e); toast('Evento oficializado', 'success'); }]);
    items.push(['Editar', () => formEditarEvento(e)]);
    items.push(['Anular', () => formAnularEvento(e), 'danger']);
    popover(anchor, items);
  }

  // ---- ASIGNACIONES MP ----------------------------------------------------
  let mpSel = new Set();
  VIEWS.asignaciones = function () {
    const S = H.getState();
    let y = params.year || YEAR, m = params.month != null ? params.month : MONTH;
    let estadoMP = params.estadoMP || 'todas';   // todas | pend | ejec
    let sinAsig = !!params.sinAsignar;
    mpSel = new Set();
    const keyMes = () => `${y}-${String(m + 1).padStart(2, '0')}`;
    const wrap = h('div', { class: 'tbl-wrap' }); const note = h('span', { class: 'count-note' });
    const bulkAsig = h('button', { class: 'btn sm primary', style: { display: 'none' }, onclick: () => formAsignarEjecutor([...mpSel], keyMes()) }, 'Asignar ejecutor');
    function updBulk() { const on = mpSel.size; bulkAsig.style.display = on ? '' : 'none'; if (on) { bulkAsig.textContent = `Asignar ejecutor (${on})`; } }
    function data() {
      const asig = (S.asignacionesMP || {})[keyMes()] || {};
      let list = S.equipos.filter(e => e.estado !== 'baja' && H.mpProgramadaEnMes(e, MESES[m]));
      if (estadoMP === 'ejec') list = list.filter(e => H.mpDelMesEjecutada(e, y, m));
      if (estadoMP === 'pend') list = list.filter(e => H.mpEstadoMes(e, y, m) === 'pendiente');
      if (sinAsig) list = list.filter(e => !asig[e.inv]);
      return { list, asig };
    }
    function render() {
      const { list, asig } = data(); const km = keyMes();
      note.textContent = `${list.length} programados · ${list.filter(e => asig[e.inv]).length} con responsable`;
      const allChk = h('input', { type: 'checkbox', onchange: e => { if (e.target.checked) list.forEach(x => mpSel.add(x.inv)); else mpSel.clear(); render(); } });
      mount(wrap, list.length ? h('table', { class: 'dense' },
        h('thead', {}, h('tr', {}, h('th', { class: 'shrink' }, allChk), h('th', {}, 'N° Inv.'), h('th', {}, 'Equipo'), h('th', {}, 'Servicio'), h('th', {}, 'Freq'), h('th', {}, 'Prog.'), h('th', {}, 'Resultado'), h('th', {}, 'Estado MP'), h('th', {}, 'Responsable'), h('th', { class: 'shrink' }, ''))),
        h('tbody', {}, ...list.map(e => {
          const chk = h('input', { type: 'checkbox', checked: mpSel.has(e.inv) ? true : false, onclick: ev => ev.stopPropagation(), onchange: ev => { ev.target.checked ? mpSel.add(e.inv) : mpSel.delete(e.inv); updBulk(); tr.classList.toggle('sel', ev.target.checked); } });
          const r = H.resultadoMPMes(e, y, m);
          const tr = h('tr', { class: mpSel.has(e.inv) ? 'sel' : '' },
            h('td', { onclick: ev => ev.stopPropagation() }, chk),
            h('td', { class: 'mono link', onclick: () => go('equipo', { inv: e.inv }) }, e.inv),
            h('td', {}, e.equipo || '—'), h('td', { class: 'muted' }, e.servicio || '—'), h('td', { class: 'muted' }, e.freq || '—'),
            h('td', { class: 'mono' }, (e.registro && e.registro[MESES[m]] && e.registro[MESES[m]].P) || (e.prog || {})[MESES[m]] || '—'),
            h('td', {}, r ? h('span', { class: 'pill ' + mpResPillCls(r) }, r) : h('span', { class: 'faint' }, '—')),
            h('td', {}, mpEstadoBadge(e, y, m)),
            h('td', {}, selectEl([['', '— sin asignar —'], ...EJECUTORES.map(x => [x, x])], asig[e.inv] || '', { onclick: ev => ev.stopPropagation(), onchange: ev => { S.asignacionesMP = S.asignacionesMP || {}; S.asignacionesMP[km] = S.asignacionesMP[km] || {}; if (ev.target.value) S.asignacionesMP[km][e.inv] = ev.target.value; else delete S.asignacionesMP[km][e.inv]; H.save(); } })),
            h('td', {}, h('button', { class: 'btn sm primary', onclick: ev => { ev.stopPropagation(); formMP(e.inv, H.fechaSugeridaMP(y, m)); } }, 'MP')));
          return tr;
        }))
      ) : h('div', { class: 'empty' }, `Sin equipos con MP programada en ${MES_ESP(m)} ${y}`));
      kbList = { rows: list.map(e => e.inv), open: inv => go('equipo', { inv }), idx: -1 };
      updBulk();
    }
    const seg = h('div', { class: 'seg' }, ...[['todas', 'Todas'], ['pend', 'Pendientes'], ['ejec', 'Ejecutadas']].map(([v, l]) =>
      h('button', { class: estadoMP === v ? 'on' : '', onclick: e => { estadoMP = v; [...seg.children].forEach(b => b.classList.remove('on')); e.target.classList.add('on'); render(); } }, l)));
    const root = h('div', {},
      h('div', { class: 'filterbar' },
        field(null, selectEl(MESES.map((mm, i) => [i, MES_ESP(i)]), m, { onchange: e => { m = +e.target.value; mpSel.clear(); render(); } })),
        field(null, selectEl([YEAR + 1, YEAR, YEAR - 1].map(yy => [yy, yy]), y, { onchange: e => { y = +e.target.value; mpSel.clear(); render(); } })),
        seg,
        h('label', { class: 'checkbox' }, h('input', { type: 'checkbox', checked: sinAsig ? true : false, onchange: e => { sinAsig = e.target.checked; mpSel.clear(); render(); } }), 'Sin asignar'),
        h('div', { class: 'tb-spacer' }),
        bulkAsig,
        h('button', { class: 'btn sm', onclick: () => descargarPlantilla(y, m) }, svg(ic.dl, 14), 'Plantilla'),
        h('button', { class: 'btn sm', onclick: () => subirPlantilla(y, m) }, svg(ic.up, 14), 'Subir'), note),
      wrap);
    render(); return root;
  };
  function mpResPillCls(r) { if (r === 'Si') return 'op'; if (/^C[1-8]$/.test(r)) return 'st'; if (r === 'Baja') return 'baja'; return 'noop'; }
  function mpEstadoBadge(e, y, m) { const s = H.mpEstadoMes(e, y, m); const map = { ejecutada: ['op', 'Ejecutada'], reprogramada: ['st', 'Reprogramada'], otro: ['noop', 'Otro'], pendiente: ['noop', 'Pendiente'] }[s]; return h('span', { class: 'pill ' + map[0] }, map[1]); }
  function formAsignarEjecutor(invs, km) {
    if (!invs.length) return;
    const ejec = selectEl([['', '— sin asignar —'], ...EJECUTORES.map(x => [x, x])], '');
    openDrawer({
      title: `Asignar ejecutor · ${invs.length} equipos`,
      body: h('div', {}, h('div', { class: 'notice info' }, `Se asignará el responsable de MP a los ${invs.length} equipos seleccionados (${km}).`), field('Responsable', ejec)),
      footer: [h('button', { class: 'btn', onclick: closeDrawer }, 'Cancelar'),
      h('button', { class: 'btn primary', onclick: () => { const S = H.getState(); S.asignacionesMP = S.asignacionesMP || {}; S.asignacionesMP[km] = S.asignacionesMP[km] || {}; invs.forEach(inv => { if (ejec.value) S.asignacionesMP[km][inv] = ejec.value; else delete S.asignacionesMP[km][inv]; }); H.save(); toast(`Responsable asignado a ${invs.length} equipos`, 'success'); closeDrawer(); } }, `Asignar a ${invs.length}`)]
    });
  }

  // ---- CUMPLIMIENTO POR SERVICIO -----------------------------------------
  VIEWS.cumplimiento = function () {
    const S = H.getState();
    let y = params.year || YEAR, m = params.month != null ? +params.month : MONTH;
    let modo = 'servicio';
    const wrap = h('div', {}); const trendBox = h('div', {});
    function filasPorResponsable() {
      const cargo = {};
      S.equipos.forEach(e => { const en = H.encargadoDe(e); if (en) cargo[en] = (cargo[en] || 0) + 1; });
      const esMP = (e, periodoAno, mes) => !e.anulado && e.tipo === 'Mantención preventiva' && e.resultado === 'Si' && e.fecha && new Date(e.fecha + 'T00:00:00').getFullYear() === y && (mes == null || new Date(e.fecha + 'T00:00:00').getMonth() === mes);
      return EJECUTORES.map(ej => {
        const pend = S.pendientes.filter(p => !p.anulado && p.estado !== 'cerrado' && p.ejecutor === ej);
        const venc = pend.filter(p => p.fechaComp && p.fechaComp < H.hoyLocal()).length;
        const mpMes = S.eventos.filter(e => e.ejecutor === ej && esMP(e, y, m)).length;
        const mpAno = S.eventos.filter(e => e.ejecutor === ej && esMP(e, y, null)).length;
        const evAno = S.eventos.filter(e => !e.anulado && e.ejecutor === ej && e.fecha && e.fecha.startsWith(String(y))).length;
        return { ej, pend: pend.length, venc, mpMes, mpAno, evAno, cargo: cargo[ej] || 0 };
      }).sort((a, b) => b.pend - a.pend || b.mpAno - a.mpAno);
    }
    function filasPorServicio() {
      const servicios = [...new Set(S.equipos.map(e => e.servicio || '(sin servicio)'))].sort();
      return servicios.map(sv => {
        const es = S.equipos.filter(e => (e.servicio || '(sin servicio)') === sv);
        const vivos = es.filter(e => e.estado !== 'baja');
        const op = es.filter(e => e.estado === 'operativo').length;
        const no = es.filter(e => e.estado === 'no_operativo').length;
        const stc = es.filter(e => e.estado === 'en_servicio_tecnico').length;
        const prog = vivos.filter(e => H.mpProgramadaEnMes(e, MESES[m]));
        const ejec = prog.filter(e => H.mpDelMesEjecutada(e, y, m)).length;
        const atr = vivos.filter(e => [...Array(m).keys()].some(mm => H.mpProgramadaEnMes(e, MESES[mm]) && H.mpEstadoMes(e, y, mm) === 'pendiente')).length;
        const pend = es.reduce((a, e) => a + H.pendientesDe(e.inv).filter(p => p.estado !== 'cerrado').length, 0);
        const pctMP = prog.length ? Math.round(ejec / prog.length * 100) : null;
        const pctOp = vivos.length ? Math.round(op / vivos.length * 100) : null;
        return { sv, total: es.length, vivos: vivos.length, op, no, stc, prog: prog.length, ejec, atr, pend, pctMP, pctOp };
      });
    }
    function pctPill(v) { if (v == null) return h('span', { class: 'faint' }, '—'); return h('span', { class: 'pill ' + (v >= 90 ? 'op' : v >= 60 ? 'st' : 'noop') }, v + '%'); }
    function bar(v) { return h('div', { class: 'progress', style: { minWidth: '70px' } }, h('i', { style: { width: (v || 0) + '%', background: v == null ? 'var(--surface-3)' : v >= 90 ? 'var(--op)' : v >= 60 ? 'var(--st)' : 'var(--noop)' } })); }
    function renderTrend() {
      const meses = MESES.map((mm, i) => {
        const prog = S.equipos.filter(e => e.estado !== 'baja' && H.mpProgramadaEnMes(e, mm));
        const ejec = prog.filter(e => H.mpDelMesEjecutada(e, y, i)).length;
        return { mm, i, prog: prog.length, ejec, pct: prog.length ? Math.round(ejec / prog.length * 100) : null };
      });
      mount(trendBox, h('div', { class: 'section', style: { marginBottom: '12px' } },
        h('div', { class: 's-hd' }, h('h3', {}, `Tendencia mensual de cumplimiento MP · ${y}`), h('span', { class: 's-sub' }, 'Clic en un mes')),
        h('div', { class: 's-bd' }, h('div', { class: 'trend' }, ...meses.map(mo => {
          const cls = mo.pct == null ? '' : mo.pct >= 90 ? 'op' : mo.pct >= 60 ? 'st' : 'noop';
          return h('div', { class: 'trend-col' + (mo.i === m ? ' on' : ''), title: `${mo.mm} ${y}: ${mo.pct == null ? 'sin programación' : mo.pct + '% · ' + mo.ejec + '/' + mo.prog}`, onclick: () => { m = mo.i; render(); } },
            h('div', { class: 'trend-val' }, mo.pct == null ? '—' : mo.pct + '%'),
            h('div', { class: 'trend-bar-wrap' }, h('div', { class: 'trend-bar ' + cls, style: { height: (mo.pct || 0) + '%' } })),
            h('div', { class: 'trend-lbl' }, mo.mm));
        })))));
    }
    function renderServicio() {
      const rows = filasPorServicio();
      const tot = rows.reduce((a, r) => ({ total: a.total + r.total, vivos: a.vivos + r.vivos, op: a.op + r.op, no: a.no + r.no, stc: a.stc + r.stc, prog: a.prog + r.prog, ejec: a.ejec + r.ejec, atr: a.atr + r.atr, pend: a.pend + r.pend }), { total: 0, vivos: 0, op: 0, no: 0, stc: 0, prog: 0, ejec: 0, atr: 0, pend: 0 });
      const totPctMP = tot.prog ? Math.round(tot.ejec / tot.prog * 100) : null;
      const totPctOp = tot.vivos ? Math.round(tot.op / tot.vivos * 100) : null;
      const fila = (r, isTot) => h('tr', { style: isTot ? { fontWeight: 700, background: 'var(--surface-2)' } : null, onclick: isTot ? null : () => go('equipos', { servicio: r.sv }) },
        h('td', {}, isTot ? 'TOTAL' : r.sv), h('td', { class: 'num' }, r.total),
        h('td', { class: 'num' }, r.op), h('td', { class: 'num', style: r.no ? { color: 'var(--noop)' } : null }, r.no), h('td', { class: 'num', style: r.stc ? { color: 'var(--st)' } : null }, r.stc),
        h('td', {}, pctPill(isTot ? totPctOp : r.pctOp)),
        h('td', { class: 'num' }, r.prog ? (r.ejec + '/' + r.prog) : '—'),
        h('td', { style: { minWidth: '130px' } }, h('div', { style: { display: 'flex', alignItems: 'center', gap: '7px' } }, bar(isTot ? totPctMP : r.pctMP), pctPill(isTot ? totPctMP : r.pctMP))),
        h('td', { class: 'num', style: r.atr ? { color: 'var(--noop)' } : null }, r.atr || '—'),
        h('td', { class: 'num' }, r.pend || '—'));
      mount(wrap, h('div', { class: 'tbl-wrap' }, h('table', { class: 'dense' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Servicio'), h('th', { class: 'num' }, 'Equipos'), h('th', { class: 'num' }, 'Oper.'), h('th', { class: 'num' }, 'No op.'), h('th', { class: 'num' }, 'ST'), h('th', {}, '% Operativo'), h('th', {}, `MP ${MES_ESP(m)}`), h('th', {}, '% Cumplimiento MP'), h('th', { class: 'num' }, 'Atrasadas'), h('th', { class: 'num' }, 'Pend.'))),
        h('tbody', {}, ...rows.map(r => fila(r)), fila(tot, true)))));
    }
    function renderResponsable() {
      const rows = filasPorResponsable();
      mount(wrap, h('div', { class: 'tbl-wrap' }, h('table', { class: 'dense' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Responsable'), h('th', { class: 'num' }, 'Pend. abiertos'), h('th', { class: 'num' }, 'Vencidos'), h('th', { class: 'num' }, `MP ${MES_ESP(m)}`), h('th', { class: 'num' }, `MP ${y}`), h('th', { class: 'num' }, `Eventos ${y}`), h('th', { class: 'num' }, 'Equipos a cargo'))),
        h('tbody', {}, ...rows.map(r => h('tr', { onclick: () => go('pendientes', { ejec: r.ej }) },
          h('td', {}, r.ej), h('td', { class: 'num' }, r.pend || h('span', { class: 'faint' }, '0')),
          h('td', { class: 'num', style: r.venc ? { color: 'var(--noop)' } : null }, r.venc || '—'),
          h('td', { class: 'num' }, r.mpMes || '—'), h('td', { class: 'num' }, r.mpAno || '—'), h('td', { class: 'num' }, r.evAno || '—'), h('td', { class: 'num' }, r.cargo || '—')))))));
    }
    function render() { renderTrend(); if (modo === 'servicio') renderServicio(); else renderResponsable(); }
    function exportar() {
      if (modo === 'responsable') {
        const rows = filasPorResponsable().map(r => [r.ej, r.pend, r.venc, r.mpMes, r.mpAno, r.evAno, r.cargo]);
        return exportTablaExcel('Responsables', `Indicadores por responsable · ${MES_ESP(m)} ${y}`, ['Responsable', 'Pend. abiertos', 'Vencidos', `MP ${MES_ESP(m)}`, `MP ${y}`, `Eventos ${y}`, 'Equipos a cargo'], rows, `SIGEM_responsables_${y}-${String(m + 1).padStart(2, '0')}.xlsx`);
      }
      const rows = filasPorServicio().map(r => [r.sv, r.total, r.op, r.no, r.stc, r.pctOp == null ? '' : r.pctOp + '%', r.prog ? (r.ejec + '/' + r.prog) : '', r.pctMP == null ? '' : r.pctMP + '%', r.atr, r.pend]);
      exportTablaExcel('Cumplimiento', `Cumplimiento por servicio · ${MES_ESP(m)} ${y}`, ['Servicio', 'Equipos', 'Operativos', 'No operativos', 'Serv. técnico', '% Operativo', `MP ${MES_ESP(m)} (ej/prog)`, '% Cumplimiento MP', 'MP atrasadas', 'Pendientes'], rows, `SIGEM_cumplimiento_${y}-${String(m + 1).padStart(2, '0')}.xlsx`);
    }
    const seg = h('div', { class: 'seg' }, ...[['servicio', 'Por servicio'], ['responsable', 'Por responsable']].map(([v, l]) =>
      h('button', { class: modo === v ? 'on' : '', onclick: e => { modo = v; [...seg.children].forEach(b => b.classList.remove('on')); e.target.classList.add('on'); render(); } }, l)));
    const root = h('div', {},
      h('div', { class: 'filterbar' }, seg,
        field(null, selectEl(MESES.map((mm, i) => [i, MES_ESP(i)]), m, { onchange: e => { m = +e.target.value; render(); } })),
        field(null, selectEl([YEAR + 1, YEAR, YEAR - 1].map(yy => [yy, yy]), y, { onchange: e => { y = +e.target.value; render(); } })),
        h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm', onclick: exportar }, svg(ic.dl, 14), 'Exportar')),
      trendBox, wrap);
    render(); return root;
  };

  // ---- CONCILIACIÓN -------------------------------------------------------
  VIEWS.conciliacion = function () {
    const S = H.getState();
    const list = h('div', { class: 'row-list' });
    const head = h('div', { class: 'section' },
      h('div', { class: 's-hd' }, h('h3', {}, 'Conciliación con maestro Excel'), h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm primary', onclick: () => importarMaestro(render) }, svg(ic.up, 14), 'Importar maestro (.xlsx)')),
      h('div', { class: 's-bd' }, h('div', { class: 'notice info' }, window.XLSX ? 'Importa el archivo con hojas PMP_AAAA y Registro_MP-AAAA. Se auto-completan celdas vacías y se listan las diferencias para resolver.' : '⚠ XLSX no disponible (sin conexión). La importación de Excel queda deshabilitada; el resto de la app funciona.')));
    function render() {
      const confs = (H.getState().conflictos || []).filter(c => c.estado === 'pendiente' || c.estado === 'pospuesto');
      if (!confs.length) { mount(list, h('div', { class: 'empty' }, h('div', { class: 'big' }, '✓'), 'Sin conflictos pendientes')); return; }
      const bulk = h('div', { class: 'filterbar' },
        h('b', {}, `${confs.length} conflicto(s)`), h('div', { class: 'tb-spacer' }),
        h('button', { class: 'btn sm', onclick: () => { confs.forEach(c => H.resolverConflicto(c, 'aceptar_maestro', null, { skipSave: true })); H.save(); toast('Todos aceptados (maestro)', 'success'); render(); } }, 'Aceptar todo (maestro)'),
        h('button', { class: 'btn sm', onclick: () => { confs.forEach(c => H.resolverConflicto(c, 'mantener_programa', null, { skipSave: true })); H.save(); toast('Todos mantenidos', 'success'); render(); } }, 'Mantener todo'));
      mount(list, bulk, ...confs.map(c => conflictoRow(c, render)));
    }
    render();
    return h('div', { class: 'view-narrow' }, head, list);
  };
  function conflictoRow(c, after) {
    const act = (accion, valor) => { H.resolverConflicto(c, accion, valor); toast('Conflicto resuelto', 'success'); after ? after() : scheduleRefresh(); };
    let body;
    if (c.tipo === 'mp_diferencia') {
      body = h('div', { style: { flex: 1 } },
        h('div', {}, h('span', { class: 'mono' }, c.inv), ' · ', c.equipo || '', ' · ', h('b', {}, H.nombreCampoConflicto(c))),
        h('div', { class: 'btn-row', style: { marginTop: '6px' } },
          h('span', { class: 'chip' }, 'Programa: ', h('b', {}, c.valorPrograma || '∅')),
          h('span', { class: 'chip' }, 'Maestro: ', h('b', {}, c.valorMaestro || '∅'))));
    } else {
      body = h('div', { style: { flex: 1 } }, h('span', { class: 'mono' }, c.inv), ' · ', h('b', {}, H.nombreCampoConflicto(c)));
    }
    return h('div', { class: 'mini-row', style: { alignItems: 'flex-start' } }, body,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn sm primary', onclick: () => act('aceptar_maestro') }, 'Maestro'),
        h('button', { class: 'btn sm', onclick: () => act('mantener_programa') }, 'Programa'),
        c.tipo === 'mp_diferencia' ? h('button', { class: 'btn sm', onclick: () => { const v = window.prompt('Valor manual:', c.valorMaestro || ''); if (v != null) act('manual', v); } }, 'Manual') : null,
        h('button', { class: 'btn sm ghost', onclick: () => act('posponer') }, 'Posponer')));
  }

  // ============================ FORMS (drawer) ==============================
  function formMP(inv, fechaDefault) {
    const eq = H.findEquipo(inv); if (!eq) return;
    const fecha = h('input', { type: 'date', value: fechaDefault || H.hoyLocal() });
    const resultado = selectEl(['Si', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'FS', 'Baja', 'NU', 'No'], H.getPref('ultimoResultadoMP', 'Si'));
    const ejecutor = selectEl([['', '—'], ...EJECUTORES.map(x => [x, x])], H.getPref('ultimoEjecutor', ''));
    const obs = h('textarea', { placeholder: 'Observación (opcional)' });
    const estadoSi = selectEl([['operativo', 'Operativo'], ['no operativo', 'No operativo']], 'operativo');
    const estadoAuto = h('input', { type: 'text', readonly: true });
    const estadoWrap = h('div', {}, estadoSi, estadoAuto);
    const sync = () => { const si = resultado.value === 'Si'; estadoSi.style.display = si ? '' : 'none'; estadoAuto.style.display = si ? 'none' : ''; if (!si) estadoAuto.value = H.estadoMPDesdeResultado(resultado.value) || '(sin cambio de estado)'; };
    resultado.onchange = sync; sync();
    const save = () => {
      let r = H.registrarMP({ inv, fecha: fecha.value, resultado: resultado.value, ejecutor: ejecutor.value, obs: obs.value, estadoSi: estadoSi.value });
      if (!r.ok && r.requiereConfirmacion) { if (window.confirm(r.aviso)) r = H.registrarMP({ inv, fecha: fecha.value, resultado: resultado.value, ejecutor: ejecutor.value, obs: obs.value, estadoSi: estadoSi.value, forzarSinProg: true }); else return; }
      if (!r.ok) return toast(r.error, 'error');
      toast(`MP registrada · ${inv} · ${r.evento.resultado}`, 'success'); closeDrawer();
    };
    openDrawer({
      title: `MP rápida · ${eq.inv}`, focus: 'select',
      body: h('div', {}, eqMini(eq),
        h('div', { class: 'grid-3' }, field('Fecha', fecha), field('Resultado', resultado), field('Estado resultante', estadoWrap)),
        field('Ejecutor', ejecutor), field('Observación', obs),
        h('div', { class: 'notice' }, 'Se guarda como borrador. Recuerda el último ejecutor/resultado para los próximos registros.')),
      footer: [h('button', { class: 'btn', onclick: closeDrawer }, 'Cancelar'), h('button', { class: 'btn primary', onclick: save }, 'Guardar MP')]
    });
  }
  function formNuevoEvento(opts) {
    let invSel = opts.inv || ''; let tipo = null;
    const body = h('div', {});
    function build() {
      const eq = invSel ? H.findEquipo(invSel) : null;
      const ciclosAb = invSel ? H.ciclosAbiertosDe(invSel) : [];
      const invInput = h('input', { type: 'text', list: 'eqlist', value: invSel, placeholder: 'N° Inventario', oninput: e => { invSel = e.target.value.trim(); if (H.findEquipo(invSel)) build(); } });
      const dl = h('datalist', { id: 'eqlist' }, ...H.getState().equipos.slice(0, 300).map(e => h('option', { value: e.inv }, `${e.inv} — ${e.equipo}`)));
      const typeGrid = h('div', { class: 'type-grid' }, ...TIPOS_EVENTO.map(t => h('button', { class: 'type-card ' + (tipo === t.label ? 'on' : ''), onclick: () => { tipo = t.label; build(); } }, h('b', {}, t.label), h('small', {}, t.desc))));
      const campos = h('div', {}); let ctrls = {};
      const fecha = h('input', { type: 'date', value: opts.fecha || H.hoyLocal() });
      const ejecutor = selectEl([['', '—'], ...EJECUTORES.map(x => [x, x])], '');
      const oficial = selectEl([['No', 'Borrador'], ['Sí', 'Oficial']], 'No');
      const obs = h('textarea', { placeholder: 'Observación / informe…' });
      function folioCtrl() { return ciclosAb.length ? selectEl([...ciclosAb.map(c => [c.folio, c.folio]), ['', '— sin vincular —']], ciclosAb[0].folio) : h('input', { type: 'text', placeholder: 'Folio SIGEM' }); }
      if (tipo === 'Solicitud de trabajo') { const folio = h('input', { type: 'text', placeholder: 'Folio (vacío = auto)' }); ctrls = { folio }; campos.append(h('div', { class: 'grid-2' }, field('Fecha', fecha), field('Ejecutor', ejecutor), field('Folio SIGEM', folio), field('Oficial', oficial)), field('Descripción de la falla', obs), h('div', { class: 'notice info' }, 'Abre un ciclo correctivo y deja el equipo "no operativo".')); }
      else if (tipo === 'Visita técnica') { const empresa = h('input', { type: 'text' }), tecnico = h('input', { type: 'text' }), tipoVisita = selectEl([['diagnóstica', 'Diagnóstica'], ['correctiva', 'Correctiva']], 'diagnóstica'), folio = folioCtrl(), estado = selectEl([['no operativo', 'No operativo'], ['operativo', 'Operativo'], ['en servicio técnico', 'En servicio técnico']], 'no operativo'); ctrls = { empresa, tecnico, tipoVisita, folio, estado }; campos.append(h('div', { class: 'grid-3' }, field('Fecha', fecha), field('Empresa', empresa), field('Técnico', tecnico)), h('div', { class: 'grid-3' }, field('Tipo visita', tipoVisita), field('Folio SIGEM', folio), field('Estado', estado)), field('Informe', obs), field('Oficial', oficial)); }
      else if (tipo === 'Orden de Compra') { const nCotiz = h('input', { type: 'text' }), nOC = h('input', { type: 'text' }), empresa = h('input', { type: 'text' }), via = selectEl([['trato_directo', 'Trato directo'], ['compra_agil', 'Compra ágil']], 'trato_directo'), folioInformeTD = h('input', { type: 'text', placeholder: 'Solo si trato directo' }), folio = folioCtrl(); ctrls = { nCotiz, nOC, empresa, via, folioInformeTD, folio }; campos.append(h('div', { class: 'grid-3' }, field('Fecha', fecha), field('N° Cotización', nCotiz), field('N° OC', nOC)), h('div', { class: 'grid-3' }, field('Empresa', empresa), field('Vía', via), field('Folio informe (TD)', folioInformeTD)), h('div', { class: 'grid-2' }, field('Folio SIGEM', folio), field('Oficial', oficial)), field('Observación', obs)); }
      else if (tipo === 'Envío a servicio técnico') { const empresa = h('input', { type: 'text' }), nEnvio = h('input', { type: 'text' }), folio = folioCtrl(); ctrls = { empresa, nEnvio, folio, estado: { value: 'en servicio técnico' } }; campos.append(h('div', { class: 'grid-3' }, field('Fecha', fecha), field('Empresa ST', empresa), field('N° Envío', nEnvio)), h('div', { class: 'grid-2' }, field('Ejecutor', ejecutor), field('Folio SIGEM', folio)), field('Oficial', oficial), field('Observación', obs), h('div', { class: 'notice' }, 'El equipo queda "en servicio técnico".')); }
      else if (tipo === 'Recepción') { const nEnvio = h('input', { type: 'text', placeholder: 'N° envío original' }), folioGuia = h('input', { type: 'text' }), folio = folioCtrl(), estado = selectEl([['operativo', 'Operativo (cierra ciclo)'], ['no operativo', 'No operativo'], ['en servicio técnico', 'En servicio técnico']], 'operativo'); ctrls = { nEnvio, folioGuia, folio, estado }; campos.append(h('div', { class: 'grid-3' }, field('Fecha', fecha), field('N° envío original', nEnvio), field('Folio guía despacho', folioGuia)), h('div', { class: 'grid-2' }, field('Folio SIGEM', folio), field('Estado', estado)), field('Observación', obs), field('Oficial', oficial)); }
      else if (tipo === 'Reparación') { const folio = folioCtrl(), estado = selectEl([['operativo', 'Operativo (cierra ciclo)'], ['no operativo', 'No operativo'], ['en servicio técnico', 'En servicio técnico']], 'operativo'), repuestos = h('input', { type: 'text', placeholder: 'Repuestos' }); ctrls = { folio, estado, repuestos }; campos.append(h('div', { class: 'grid-3' }, field('Fecha', fecha), field('Folio SIGEM', folio), field('Estado', estado)), field('Repuestos', repuestos), field('Descripción', obs), field('Oficial', oficial)); }
      else if (tipo === 'Mantención preventiva') { const resultado = selectEl(['Si', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'FS', 'Baja', 'NU', 'No'], 'Si'), mpEstado = selectEl([['operativo', 'Operativo'], ['no operativo', 'No operativo']], 'operativo'), ejec2 = selectEl([['', '—'], ...EJECUTORES.map(x => [x, x])], ''); ctrls = { resultado, _mpEstado: mpEstado, ejecutor2: ejec2 }; campos.append(h('div', { class: 'grid-3' }, field('Fecha', fecha), field('Resultado', resultado), field('Estado (si "Si")', mpEstado)), h('div', { class: 'grid-2' }, field('Ejecutor', ejecutor), field('Ejecutor 2', ejec2)), field('Observación', obs), field('Oficial', oficial), h('div', { class: 'notice' }, 'C1–C8 → pendiente de reprogramación · NU → "Localizar equipo" · Baja → equipo a baja.')); }

      const guardar = () => {
        const d = { inv: invSel, tipo, fecha: fecha.value, ejecutor: ejecutor.value, obs: obs.value, oficial: oficial.value };
        for (const k in ctrls) { if (k === '_mpEstado') d.mpEstadoSi = ctrls[k].value; else d[k] = ctrls[k].value; }
        let r = H.crearEvento(d);
        if (!r.ok && r.requiereConfirmacion) { if (window.confirm(r.aviso)) { d.forzarSinProg = true; r = H.crearEvento(d); } else return; }
        if (!r.ok) return toast(r.error, 'error');
        toast(`Evento "${tipo}" registrado`, 'success'); closeDrawer();
      };
      mount(body,
        field('N° Inventario', h('div', {}, invInput, dl)), eq ? eqMini(eq) : null,
        h('div', { class: 'field' }, h('label', {}, 'Tipo de evento'), typeGrid),
        tipo ? h('div', {}, h('hr', { class: 'sep' }), campos) : h('div', { class: 'empty' }, 'Selecciona un tipo de evento'));
      // footer guardar
      mount(drawer.querySelector('.d-ft') || h('div', {}));
      const ft = drawer.querySelector('.d-ft');
      if (ft) mount(ft, h('button', { class: 'btn', onclick: closeDrawer }, 'Cancelar'), tipo ? h('button', { class: 'btn primary', onclick: guardar }, 'Guardar evento') : null);
    }
    openDrawer({ title: 'Nuevo evento', wide: true, body, footer: [h('span', {})] });
    build();
  }
  function formEditarEvento(e) {
    const fecha = h('input', { type: 'date', value: e.fecha || '' });
    const ejecutor = selectEl([['', '—'], ...EJECUTORES.map(x => [x, x])], e.ejecutor || '');
    const oficial = selectEl([['No', 'Borrador'], ['Sí', 'Oficial']], e.oficial || 'No');
    const obs = h('textarea', {}, e.obs || '');
    openDrawer({
      title: 'Editar evento · ' + e.tipo, body: h('div', {}, h('div', { class: 'grid-2' }, field('Fecha', fecha), field('Ejecutor', ejecutor), field('Oficial', oficial)), field('Observación', obs)),
      footer: [h('button', { class: 'btn', onclick: closeDrawer }, 'Cancelar'), h('button', { class: 'btn primary', onclick: () => { H.editarEvento(e, { fecha: fecha.value, obs: obs.value, ejecutor: ejecutor.value, oficial: oficial.value }); toast('Evento actualizado', 'success'); closeDrawer(); } }, 'Guardar')]
    });
  }
  function formAnularEvento(e) {
    const motivo = selectEl([['', '— motivo —'], ...MOTIVOS_ANULACION.map(m => [m, m]), ['__otro', 'Otro…']], '');
    const otro = h('textarea', { placeholder: 'Detalle' });
    openDrawer({
      title: 'Anular evento · ' + e.tipo, body: h('div', {}, h('div', { class: 'notice danger' }, 'Anular revierte efectos: limpia R del mes, recalcula estado y anula ciclos/pendientes asociados.'), field('Motivo', motivo), field('Detalle (opcional)', otro)),
      footer: [h('button', { class: 'btn', onclick: closeDrawer }, 'Cancelar'), h('button', { class: 'btn danger', onclick: () => { const s = motivo.value; const x = otro.value.trim(); let m; if (s === '__otro') { if (!x) return toast('Especifica el motivo', 'error'); m = x; } else if (!s) return toast('Selecciona un motivo', 'error'); else m = s + (x ? ' — ' + x : ''); const r = H.anularEvento(e, m); toast('Evento anulado' + (r.revertidos.length ? ' (' + r.revertidos.join('; ') + ')' : ''), 'success'); closeDrawer(); } }, 'Anular')]
    });
  }
  function formNuevoPendiente(opts) {
    const inv = h('input', { type: 'text', list: 'eqlistp', value: opts.inv || '', placeholder: 'N° Inventario' });
    const dl = h('datalist', { id: 'eqlistp' }, ...H.getState().equipos.slice(0, 300).map(e => h('option', { value: e.inv }, e.equipo || '')));
    const tipo = selectEl(Object.entries(TIPO_PENDIENTE), 'gestion_general');
    const desc = h('textarea', { placeholder: 'Descripción del pendiente' });
    const ejec = selectEl([['', '—'], ...EJECUTORES.map(x => [x, x])], '');
    const fComp = h('input', { type: 'date' }); const fRec = h('input', { type: 'date' });
    openDrawer({
      title: 'Nuevo pendiente', focus: 'input', body: h('div', {}, h('div', { class: 'grid-2' }, field('N° Inventario', h('div', {}, inv, dl)), field('Tipo', tipo)), field('Descripción', desc), h('div', { class: 'grid-3' }, field('Ejecutor', ejec), field('Compromiso', fComp), field('Recordatorio', fRec))),
      footer: [h('button', { class: 'btn', onclick: closeDrawer }, 'Cancelar'), h('button', { class: 'btn primary', onclick: () => { const r = H.crearPendiente({ inv: inv.value, tipo: tipo.value, desc: desc.value, ejecutor: ejec.value, fechaComp: fComp.value, proxRecord: fRec.value, eventoOrigen: opts.eventoOrigen }); if (!r.ok) return toast(r.error, 'error'); toast('Pendiente creado', 'success'); closeDrawer(); } }, 'Crear')]
    });
  }
  function formPendiente(p) {
    const eq = H.findEquipo(p.inv) || {};
    const tipo = selectEl(Object.entries(TIPO_PENDIENTE), p.tipo);
    const estado = selectEl([['no_iniciado', 'No iniciado'], ['en_proceso', 'En proceso'], ['cerrado', 'Resuelto']], p.estado);
    const ejec = selectEl([['', '—'], ...EJECUTORES.map(x => [x, x])], p.ejecutor || '');
    const desc = h('textarea', {}, p.desc || '');
    const fComp = h('input', { type: 'date', value: p.fechaComp || '' }); const fRec = h('input', { type: 'date', value: p.proxRecord || '' });
    // tareas
    const tareasBox = h('div', { class: 'row-list' });
    const renderTareas = () => { const ts = H.getState().tareas.filter(t => t.pendId === p.id || (p.tareas || []).includes(t.id)); mount(tareasBox, ts.length ? ts.map(t => h('label', { class: 'mini-row ' + (t.estado === 'cerrado' ? 'done' : '') }, h('input', { type: 'checkbox', checked: t.estado === 'cerrado' ? true : false, onchange: e => { const r = H.toggleTarea(t, e.target.checked); renderTareas(); if (r.todasCerradas && p.estado !== 'cerrado' && window.confirm('Todas las tareas cerradas. ¿Cerrar el pendiente?')) { H.cerrarPendiente(p, ''); closeDrawer(); } } }), h('span', { class: 'm-txt' }, t.desc))) : h('div', { class: 'faint', style: { fontSize: '11.5px' } }, 'Sin tareas')); };
    renderTareas();
    const nuevaTarea = h('input', { type: 'text', placeholder: 'Nueva tarea + Enter', onkeydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { H.agregarTareaPendiente(p, e.target.value); e.target.value = ''; renderTareas(); } } });
    // seguimientos
    const segBox = h('div', { class: 'row-list' });
    const renderSeg = () => mount(segBox, (p.seguimientos || []).length ? p.seguimientos.map(s => h('div', { class: 'mini-row', style: { display: 'block' } }, h('div', { class: 'm-meta' }, h('b', {}, s.autor), ' · ', fmtFecha(s.fecha)), h('div', { class: 'm-txt' }, s.texto))) : h('div', { class: 'faint', style: { fontSize: '11.5px' } }, 'Sin seguimientos'));
    renderSeg();
    const nuevoSeg = h('input', { type: 'text', placeholder: 'Agregar seguimiento + Enter', onkeydown: e => { if (e.key === 'Enter' && e.target.value.trim()) { H.agregarSeguimiento(p, e.target.value); e.target.value = ''; renderSeg(); } } });
    openDrawer({
      title: 'Pendiente · ' + p.inv, wide: true,
      body: h('div', {}, eqMini(eq, p),
        h('div', { class: 'grid-2' }, field('Tipo', tipo), field('Estado', estado), field('Ejecutor', ejec), field('Equipo', h('div', { class: 'muted', style: { padding: '7px 0' } }, `${p.inv} · ${eq.equipo || '—'}`))),
        field('Descripción', desc), h('div', { class: 'grid-2' }, field('Compromiso', fComp), field('Recordatorio', fRec)),
        h('div', { class: 'field' }, h('label', {}, 'Tareas atómicas'), tareasBox, nuevaTarea),
        h('div', { class: 'field' }, h('label', {}, 'Seguimientos'), segBox, nuevoSeg)),
      footer: [
        h('button', { class: 'btn danger left', onclick: () => { if (window.confirm('¿Anular pendiente?')) { H.anularPendiente(p); closeDrawer(); } } }, 'Anular'),
        h('button', { class: 'btn', onclick: closeDrawer }, 'Cerrar'),
        h('button', { class: 'btn primary', onclick: () => { H.actualizarPendiente(p, { tipo: tipo.value, estado: estado.value, ejecutor: ejec.value, desc: desc.value, fechaComp: fComp.value, proxRecord: fRec.value }); toast('Pendiente actualizado', 'success'); closeDrawer(); } }, 'Guardar')]
    });
  }
  function formBaja(eq) {
    const motivo = h('textarea', { placeholder: 'Motivo de la baja' });
    openDrawer({
      title: 'Dar de baja · ' + eq.inv, body: h('div', {}, eqMini(eq), h('div', { class: 'notice danger' }, 'El equipo pasa a "baja", se marca la matriz y se cierran sus pendientes activos.'), field('Motivo', motivo)),
      footer: [h('button', { class: 'btn', onclick: closeDrawer }, 'Cancelar'), h('button', { class: 'btn danger', onclick: () => { if (!motivo.value.trim()) return toast('Motivo requerido', 'error'); H.darDeBaja(eq, motivo.value.trim()); toast('Equipo dado de baja', 'success'); closeDrawer(); go('equipo', { inv: eq.inv }); } }, 'Confirmar baja')]
    });
  }
  function formAsignarEncargado(eq) {
    const sel = selectEl([['', '— sin asignar —'], ...EJECUTORES.map(x => [x, x])], eq.encargado || '');
    openDrawer({
      title: 'Encargado del equipo · ' + eq.inv,
      body: h('div', {}, eqMini(eq),
        h('div', { class: 'notice info' }, eq.encargado ? 'Tiene un responsable asignado explícitamente.' : 'Sin responsable explícito; hoy se muestra el derivado (ciclo abierto o último ejecutor): ' + (H.encargadoDe(eq) || '—') + '.'),
        field('Responsable del equipo', sel)),
      footer: [h('button', { class: 'btn', onclick: closeDrawer }, 'Cancelar'),
      h('button', { class: 'btn primary', onclick: () => { H.asignarEncargado(eq, sel.value || null); H.save(); toast('Encargado actualizado', 'success'); closeDrawer(); go('equipo', { inv: eq.inv }); } }, 'Guardar')]
    });
  }
  function eqMini(eq, p) {
    return h('div', { class: 'mini-row', style: { display: 'block' } },
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, h('b', {}, eq.equipo || (p && p.equipo) || '—'), h('span', { class: 'mono faint' }, eq.inv || (p && p.inv)), eq.estado ? estadoPill(eq.estado) : null),
      h('div', { class: 'faint', style: { fontSize: '11px', marginTop: '3px' } }, [eq.servicio, eq.marca, eq.modelo, eq.serie ? 'S/N ' + eq.serie : null].filter(Boolean).join(' · ')));
  }

  // ============================ popover ====================================
  let pop = null;
  function popover(anchor, items) {
    pop && pop.remove();
    const r = anchor.getBoundingClientRect();
    pop = h('div', { class: 'cmdk', style: { position: 'fixed', top: (r.bottom + 4) + 'px', left: 'auto', right: (window.innerWidth - r.right) + 'px', transform: 'none', width: '180px' } },
      h('div', { class: 'cmdk-list' }, ...items.map(([lbl, fn, cls]) => h('div', { class: 'cmdk-item', onclick: () => { pop.remove(); pop = null; fn(); } }, h('span', { class: 'c-main' }, h('span', { class: 'c-title', style: cls === 'danger' ? { color: 'var(--noop)' } : null }, lbl))))));
    document.body.appendChild(pop);
    setTimeout(() => document.addEventListener('click', closePop), 0);
  }
  function closePop() { pop && pop.remove(); pop = null; document.removeEventListener('click', closePop); }

  // ============================ command palette =============================
  const cmdkScrim = h('div', { class: 'cmdk-scrim', onclick: () => closeCmdk() }); document.body.appendChild(cmdkScrim);
  let cmdkEl = null, cmdkIdx = 0, cmdkItems = [];
  function openCmdk() {
    const input = h('input', { type: 'text', placeholder: 'Buscar equipo o acción…  (Esc para cerrar)' });
    const listEl = h('div', { class: 'cmdk-list' });
    cmdkEl = h('div', { class: 'cmdk' }, input, listEl); document.body.appendChild(cmdkEl); cmdkScrim.classList.add('on');
    const actions = [
      ['Ir: Cola de trabajo', () => go('inicio'), '⌂'], ['Ir: Equipos', () => go('equipos'), '▦'], ['Ir: Pendientes', () => go('pendientes'), '✓'],
      ['Ir: Ciclos', () => go('ciclos'), '↻'], ['Ir: Eventos', () => go('eventos'), '≡'], ['Ir: Asignaciones MP', () => go('asignaciones'), '▤'], ['Ir: Conciliación', () => go('conciliacion'), '⤳'],
      ['Nuevo evento', () => { closeCmdk(); formNuevoEvento({}); }, '+'], ['Nuevo pendiente', () => { closeCmdk(); formNuevoPendiente({}); }, '+'],
      ['Exportar backup JSON', () => { closeCmdk(); backupExport(); }, '⭳'], ['Exportar Excel', () => { closeCmdk(); excelExport(); }, '⭳']
    ];
    function render(q) {
      cmdkItems = []; clear(listEl); cmdkIdx = 0;
      const nq = norm(q);
      const acts = actions.filter(a => !nq || norm(a[0]).includes(nq));
      if (acts.length) { listEl.appendChild(h('div', { class: 'cmdk-sec' }, 'Acciones')); acts.forEach(a => addItem(a[2], a[0], '', a[1])); }
      if (nq.length >= 1) {
        const eqs = H.getState().equipos.filter(e => norm(`${e.inv} ${e.equipo} ${e.serie} ${e.marca}`).includes(nq)).slice(0, 8);
        if (eqs.length) { listEl.appendChild(h('div', { class: 'cmdk-sec' }, 'Equipos')); eqs.forEach(e => addItem('▦', e.inv, `${e.equipo || ''} · ${e.servicio || ''}`, () => { closeCmdk(); go('equipo', { inv: e.inv }); })); }
      }
      hi();
    }
    function addItem(icon, title, sub, fn) { const el = h('div', { class: 'cmdk-item', onclick: fn, onmouseenter: () => { cmdkIdx = cmdkItems.indexOf(el); hi(); } }, h('span', { class: 'c-ico' }, icon), h('div', { class: 'c-main' }, h('div', { class: 'c-title' }, title), sub ? h('div', { class: 'c-sub' }, sub) : null)); el._fn = fn; cmdkItems.push(el); listEl.appendChild(el); }
    function hi() { cmdkItems.forEach((el, i) => el.classList.toggle('on', i === cmdkIdx)); const on = cmdkItems[cmdkIdx]; on && on.scrollIntoView && on.scrollIntoView({ block: 'nearest' }); }
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdkIdx = Math.min(cmdkIdx + 1, cmdkItems.length - 1); hi(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkIdx = Math.max(cmdkIdx - 1, 0); hi(); }
      else if (e.key === 'Enter') { e.preventDefault(); cmdkItems[cmdkIdx] && cmdkItems[cmdkIdx]._fn(); }
      else if (e.key === 'Escape') closeCmdk();
    });
    render(''); setTimeout(() => input.focus(), 30);
  }
  function closeCmdk() { cmdkEl && cmdkEl.remove(); cmdkEl = null; cmdkScrim.classList.remove('on'); }

  // ============================ backup / excel / plantilla ==================
  function dl(blob, name) { const url = URL.createObjectURL(blob); const a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
  // Exporta una lista (la vista ACTUAL ya filtrada) a un .xlsx de una hoja, con autofiltro.
  function exportTablaExcel(hoja, titulo, header, rows, filename) {
    if (!window.XLSX) return toast('XLSX no disponible (sin conexión)', 'error');
    const aoa = [[titulo], [], header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(header.length - 1, 1) } }];
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2 + rows.length, c: header.length - 1 } }) };
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31));
    dl(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), filename);
    toast(`Exportadas ${rows.length} fila(s)`, 'success');
  }
  function backupExport() { dl(new Blob([H.exportarBackupJSON()], { type: 'application/json' }), 'sigem-backup-' + H.hoyLocal() + '.json'); toast('Backup JSON exportado', 'success'); }
  function backupImport() {
    const inp = h('input', { type: 'file', accept: 'application/json', style: { display: 'none' }, onchange: async e => { const f = e.target.files[0]; if (!f) return; try { const data = JSON.parse(await f.text()); const msg = `Importar backup?\n· Equipos: ${data.equipos?.length || 0}\n· Eventos: ${data.eventos?.length || 0}\nReemplaza los datos actuales.`; if (!window.confirm(msg)) return; const r = H.importarBackup(data); if (!r.ok) return toast(r.error, 'error'); toast(`Importado · ${r.eventos} eventos`, 'success'); go('inicio'); } catch (err) { toast('Error: ' + err.message, 'error'); } } });
    document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 1000);
  }
  // Export Excel — "Cuaderno de operaciones" autónomo, pensado para trabajar SIN
  // la aplicación: portada con instrucciones + leyenda de códigos, tablero por
  // servicio, hoja de ruta imprimible (columnas en blanco para registrar a mano),
  // plan anual P/R, inventario, pendientes (con columnas para actualizar), ciclos
  // y bitácora. Todas las tablas con autofiltro y títulos combinados.
  function excelExport() {
    if (!window.XLSX) return toast('XLSX no disponible (sin conexión)', 'error');
    const S = H.getState(); S.equipos.forEach(H.recalcEstadoEquipo);
    const wb = XLSX.utils.book_new();
    const year = YEAR, hoy = H.hoyLocal(), periodo = MES_ESP(MONTH) + ' ' + year;
    const M = (r, c0, c1) => ({ s: { r, c: c0 }, e: { r, c: c1 } });
    function tableSheet(title, subtitle, header, rows, cols) {
      const aoa = [[title]]; aoa.push(subtitle ? [subtitle] : []);
      const headRow = aoa.length; aoa.push(header); rows.forEach(r => aoa.push(r));
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      if (cols) ws['!cols'] = cols;
      ws['!merges'] = [M(0, 0, Math.max(header.length - 1, 1))];
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headRow, c: 0 }, e: { r: headRow + rows.length, c: header.length - 1 } }) };
      return ws;
    }
    const add = (ws, name) => XLSX.utils.book_append_sheet(wb, ws, name);

    // datos base
    const op = S.equipos.filter(e => e.estado === 'operativo');
    const noOp = S.equipos.filter(e => e.estado === 'no_operativo');
    const enST = S.equipos.filter(e => e.estado === 'en_servicio_tecnico');
    const baja = S.equipos.filter(e => e.estado === 'baja');
    const eqVivos = S.equipos.filter(e => e.estado !== 'baja');
    const alerta30 = S.equipos.filter(e => ['no_operativo', 'en_servicio_tecnico'].includes(e.estado) && H.diasEnEstado(e) > 30);
    const mpProg = eqVivos.filter(e => H.mpProgramadaEnMes(e, MESES[MONTH]));
    const mpEjec = mpProg.filter(e => H.mpDelMesEjecutada(e, YEAR, MONTH));
    const mpPendL = mpProg.filter(e => H.mpEstadoMes(e, YEAR, MONTH) === 'pendiente');
    const pct = mpProg.length ? Math.round(mpEjec.length / mpProg.length * 100) : 0;
    const mpAtras = eqVivos.filter(e => [...Array(MONTH).keys()].some(m => H.mpProgramadaEnMes(e, MESES[m]) && H.mpEstadoMes(e, YEAR, m) === 'pendiente'));
    const pendAb = S.pendientes.filter(p => !p.anulado && p.estado !== 'cerrado');
    const pendVenc = pendAb.filter(p => p.fechaComp && p.fechaComp < hoy);
    const ciclosAb = S.ciclos.filter(c => c.estado === 'abierto');
    const borr = S.eventos.filter(e => e.oficial !== 'Sí' && !e.anulado);

    // ===== 1) INICIO (portada + instrucciones + leyenda) =====
    const inicio = [
      ['SIGEM · Cuaderno de operaciones — Equipos Biomédicos Críticos'],
      ['Documento para trabajar SIN acceso a la aplicación'],
      [],
      ['Exportado el', hoy, '', 'Periodo MP', periodo],
      ['Equipos en catálogo', S.equipos.length, '', 'MP del mes', mpEjec.length + '/' + mpProg.length + ' (' + pct + '%)'],
      [],
      ['CÓMO USAR ESTE ARCHIVO'],
      ['1.', 'Cada hoja es independiente. Usa los filtros (▼) de los encabezados para ordenar y buscar.'],
      ['2.', '"Hoja de ruta MP" está pensada para imprimir y registrar la mantención del mes a mano.'],
      ['3.', 'Las columnas con (✎) están en blanco para que las completes tú.'],
      ['4.', 'Al volver a la aplicación, transcribe lo registrado (o importa el respaldo JSON).'],
      [],
      ['CONTENIDO'],
      ['Tablero', 'Indicadores y estado por servicio, a la fecha de exportación.'],
      ['Hoja de ruta MP', 'MP programadas del mes para ejecutar y firmar manualmente.'],
      ['Plan anual MP', 'Carta gantt: Programado (P) y Realizado (R) por mes.'],
      ['Inventario', 'Catálogo completo de equipos con su estado actual.'],
      ['Pendientes', 'Gestiones por resolver, con columnas para actualizar.'],
      ['Ciclos correctivos', 'Fallas/correctivos con apertura y cierre.'],
      ['Bitácora', 'Historial de eventos registrados.'],
      [],
      ['LEYENDA · ESTADOS DEL EQUIPO'],
      ['Operativo', 'Funciona y está disponible.'],
      ['No operativo', 'Fuera de servicio (falla / espera de repuestos).'],
      ['En servicio técnico', 'Enviado a reparación externa.'],
      ['Baja', 'Equipo dado de baja.'],
      ['Desconocido', 'Sin información de estado.'],
      [],
      ['LEYENDA · RESULTADO DE LA MP'],
      ['Si', 'Mantención preventiva realizada.'],
      ...Object.keys(CAUSALES).map(k => [k, CAUSALES[k].desc + (CAUSALES[k].reprog30 ? ' — reprogramar dentro de 30 días.' : '')]),
      ['FS', 'Equipo fuera de servicio.'],
      ['NU', 'Equipo no ubicado.'],
      ['Baja', 'Equipo dado de baja.'],
      ['No', 'No realizada.'],
      [],
      ['LEYENDA · TIPOS DE PENDIENTE'],
      ...Object.keys(TIPO_PENDIENTE).map(k => [TIPO_PENDIENTE[k], '']),
      [],
      ['LEYENDA · PROGRAMACIÓN (columna P)'],
      ['X', 'Mantención programada en el mes.'],
      ['R / RA', 'Reprogramada.'],
      ['PM', 'Puesta en marcha / programada.']
    ];
    const wsInicio = XLSX.utils.aoa_to_sheet(inicio);
    wsInicio['!cols'] = [{ wch: 22 }, { wch: 72 }, { wch: 4 }, { wch: 14 }, { wch: 18 }];
    wsInicio['!merges'] = [M(0, 0, 4), M(1, 0, 4)];
    add(wsInicio, 'Inicio');

    // ===== 2) TABLERO =====
    const servicios = [...new Set(S.equipos.map(e => e.servicio || '(sin servicio)'))].sort();
    const svcRows = servicios.map(sv => {
      const es = S.equipos.filter(e => (e.servicio || '(sin servicio)') === sv);
      const prog = es.filter(e => e.estado !== 'baja' && H.mpProgramadaEnMes(e, MESES[MONTH]));
      const ejec = prog.filter(e => H.mpDelMesEjecutada(e, YEAR, MONTH)).length;
      const pend = es.reduce((a, e) => a + H.pendientesDe(e.inv).filter(p => p.estado !== 'cerrado').length, 0);
      return [sv, es.length, es.filter(e => e.estado === 'operativo').length, es.filter(e => e.estado === 'no_operativo').length,
        es.filter(e => e.estado === 'en_servicio_tecnico').length, prog.length ? (ejec + '/' + prog.length) : '—',
        prog.length ? Math.round(ejec / prog.length * 100) + '%' : '—', pend];
    });
    const tablero = [
      ['Tablero de indicadores · ' + periodo], [],
      ['INDICADOR', 'VALOR'],
      ['Equipos en catálogo', S.equipos.length],
      ['  · Operativos', op.length],
      ['  · No operativos', noOp.length],
      ['  · En servicio técnico', enST.length],
      ['  · Baja', baja.length],
      ['Alertas (fuera de servicio > 30 días)', alerta30.length],
      ['MP programadas del mes', mpProg.length],
      ['  · Ejecutadas', mpEjec.length],
      ['  · Pendientes', mpPendL.length],
      ['  · % cumplido', pct + '%'],
      ['MP atrasadas (meses previos)', mpAtras.length],
      ['Pendientes abiertos', pendAb.length],
      ['  · Vencidos', pendVenc.length],
      ['Ciclos correctivos abiertos', ciclosAb.length],
      ['Eventos en borrador (sin oficializar)', borr.length]
    ];
    const wsTab = XLSX.utils.aoa_to_sheet(tablero);
    wsTab['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 16 }, { wch: 7 }, { wch: 13 }];
    wsTab['!merges'] = [M(0, 0, 1)];
    XLSX.utils.sheet_add_aoa(wsTab, [[], ['ESTADO POR SERVICIO'],
      ['Servicio', 'Equipos', 'Operativos', 'No oper.', 'Serv. téc.', 'MP mes (ej/prog)', '% MP', 'Pend. abiertos'],
      ...svcRows], { origin: -1 });
    add(wsTab, 'Tablero');

    // ===== 3) HOJA DE RUTA MP (imprimible, columnas en blanco) =====
    const keyMes = `${year}-${String(MONTH + 1).padStart(2, '0')}`;
    const asig = (S.asignacionesMP || {})[keyMes] || {};
    const rutaHeader = ['N° Inv.', 'Equipo', 'Servicio', 'Unidad', 'Ubicación', 'Freq', 'Responsable asignado', 'Prog.', 'Realizada ✎', 'Fecha ✎', 'Estado resultante ✎', 'Firma ✎', 'Observación ✎'];
    const rutaRows = mpProg.slice().sort((a, b) => (a.servicio || '').localeCompare(b.servicio || '')).map(e => [
      e.inv, e.equipo || '', e.servicio || '', e.unidad || '', e.ubic || '', e.freq || '', asig[e.inv] || '', (e.prog || {})[MESES[MONTH]] || '', '', '', '', '', ''
    ]);
    add(tableSheet('Hoja de ruta MP · ' + periodo, 'Imprime esta hoja y registra cada MP a medida que la ejecutas. Códigos de "Realizada" en la hoja Inicio.', rutaHeader, rutaRows,
      [{ wch: 13 }, { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 11 }, { wch: 24 }, { wch: 7 }, { wch: 12 }, { wch: 11 }, { wch: 18 }, { wch: 14 }, { wch: 34 }]), 'Hoja de ruta MP');

    // ===== 4) PLAN ANUAL MP (P/R por mes) =====
    const planTop = ['', '', '', '', '']; MESES.forEach(m => planTop.push(m, ''));
    const planHd = ['N° Inv.', 'Equipo', 'Servicio', 'Freq', 'Responsable']; MESES.forEach(() => planHd.push('P', 'R'));
    const planRows = S.equipos.map(e => {
      const row = [e.inv, e.equipo || '', e.servicio || '', e.freq || '', H.encargadoDe(e) || ''];
      MESES.forEach(m => { const reg = (e.registro || {})[m] || {}; row.push((reg.P || (e.prog || {})[m] || ''), (reg.R || '')); });
      return row;
    });
    const wsPlan = XLSX.utils.aoa_to_sheet([['Plan anual de mantención preventiva · ' + year], planTop, planHd, ...planRows]);
    wsPlan['!cols'] = [{ wch: 13 }, { wch: 24 }, { wch: 20 }, { wch: 10 }, { wch: 22 }, ...Array(24).fill({ wch: 4 })];
    const merges = [M(0, 0, 28)]; MESES.forEach((m, i) => merges.push(M(1, 5 + i * 2, 5 + i * 2 + 1)));
    wsPlan['!merges'] = merges;
    wsPlan['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2 + planRows.length, c: planHd.length - 1 } }) };
    add(wsPlan, `Plan anual MP ${year}`);

    // ===== 5) INVENTARIO =====
    const invHeader = ['N° Inv.', 'Carpeta', 'Serie', 'Familia', 'Equipo', 'Marca', 'Modelo', 'Servicio', 'Unidad', 'Ubicación', 'Procedencia', 'Año', 'VUR', 'Clasificación', 'Freq MP', 'Estado', 'Días en estado', 'Pend. abiertos', 'Ciclo abierto', 'Encargado'];
    const invRows = S.equipos.map(e => [e.inv, e.carpeta || '', e.serie || '', e.fam || '', e.equipo || '', e.marca || '', e.modelo || '', e.servicio || '', e.unidad || '', e.ubic || '', e.proc || '', e.ano || '', e.vur || '', e.clasif || '', e.freq || '', ESTADO_LABEL[e.estado] || e.estado, H.diasEnEstado(e), H.pendientesDe(e.inv).filter(p => p.estado !== 'cerrado').length, H.ciclosAbiertosDe(e.inv).length ? 'Sí' : 'No', H.encargadoDe(e) || '']);
    add(tableSheet('Inventario de equipos', 'Catálogo completo al ' + hoy + '.', invHeader, invRows,
      [{ wch: 13 }, { wch: 8 }, { wch: 15 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 6 }, { wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 13 }, { wch: 12 }, { wch: 11 }, { wch: 20 }]), 'Inventario');

    // ===== 6) PENDIENTES (con columnas para actualizar offline) =====
    const pHeader = ['ID', 'N° Inv.', 'Equipo', 'Servicio', 'Tipo', 'Descripción', 'Responsable', 'Creado', 'Compromiso', 'Estado actual', 'Avance ✎', 'Nuevo estado ✎', 'Fecha ✎'];
    const pRows = S.pendientes.filter(p => !p.anulado).sort((a, b) => (a.estado === 'cerrado' ? 1 : 0) - (b.estado === 'cerrado' ? 1 : 0) || (a.fechaComp || '9999').localeCompare(b.fechaComp || '9999')).map(p => [p.id, p.inv, p.equipo || '', p.servicio || '', TIPO_PENDIENTE[p.tipo] || p.tipo, p.desc || '', p.ejecutor || '', fmtFecha(p.fechaCrea), fmtFecha(p.fechaComp), ESTADO_PEND_LABEL[p.estado] || p.estado, '', '', '']);
    add(tableSheet('Pendientes', 'Completa las columnas (✎) para hacer seguimiento sin la aplicación.', pHeader, pRows,
      [{ wch: 5 }, { wch: 13 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 44 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 30 }, { wch: 14 }, { wch: 11 }]), 'Pendientes');

    // ===== 7) CICLOS CORRECTIVOS =====
    const cHeader = ['Folio SIGEM', 'N° Inv.', 'Equipo', 'Estado', 'Apertura', 'Cierre', 'Ingeniero', 'Descripción inicial'];
    const cRows = S.ciclos.slice().sort((a, b) => (a.estado === 'abierto' ? 0 : 1) - (b.estado === 'abierto' ? 0 : 1)).map(c => { const eq = H.findEquipo(c.inv) || {}; return [c.folio, c.inv, eq.equipo || '', c.estado, fmtFecha(c.fechaApertura), fmtFecha(c.fechaCierre), c.ingenieroAsignado || '', c.descripcionInicial || '']; });
    add(tableSheet('Ciclos correctivos', null, cHeader, cRows,
      [{ wch: 24 }, { wch: 13 }, { wch: 22 }, { wch: 11 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 46 }]), 'Ciclos correctivos');

    // ===== 8) BITÁCORA (historial de eventos) =====
    const bHeader = ['Fecha', 'N° Inv.', 'Equipo', 'Servicio', 'Tipo', 'Resultado', 'Estado', 'Ejecutor', 'Folio', 'Oficial', 'Origen', 'Observación'];
    const bRows = S.eventos.filter(e => !e.anulado).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(e => [fmtFecha(e.fecha), e.inv, e.equipo || '', e.servicio || '', H.etiquetaTipoEvento(e), e.resultado || '', e.estado || '', e.ejecutor || '', e.folio || '', e.oficial || 'No', H.eventoEsAuto(e) ? 'Automático' : 'Manual', e.obs || '']);
    add(tableSheet('Bitácora de eventos', null, bHeader, bRows,
      [{ wch: 12 }, { wch: 13 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 11 }, { wch: 44 }]), 'Bitácora');

    dl(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `SIGEM_cuaderno_${hoy}.xlsx`);
    toast(`Excel exportado · ${wb.SheetNames.length} hojas`, 'success');
  }
  function descargarPlantilla(y, m) {
    if (!window.XLSX) return toast('XLSX no disponible', 'error');
    const d = H.construirAsignacionMP(y, m);
    if (!d.rows.length) return toast(`Sin equipos programados en ${MES_ESP(m)} ${y}`, 'warn-backup');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([d.header, ...d.rows]); XLSX.utils.book_append_sheet(wb, ws, 'Asignación');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Responsable oficial'], ...EJECUTORES.map(e => [e])]), 'Responsables_oficiales');
    dl(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `Plantilla_${MES_ESP(m)}_${y}.xlsx`);
    toast(`Plantilla: ${d.rows.length} equipos`, 'success');
  }
  function subirPlantilla(y, m) {
    if (!window.XLSX) return toast('XLSX no disponible', 'error');
    const inp = h('input', { type: 'file', accept: '.xlsx,.xls', style: { display: 'none' }, onchange: async e => { const f = e.target.files[0]; if (!f) return; try { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const hoja = wb.SheetNames.find(n => /asignaci/i.test(n)) || wb.SheetNames[0]; const rows = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: null, blankrows: false }); const r = H.procesarPlantillaMP(rows, y, m); if (!r.ok) return toast(r.error, 'error'); toast(`${r.cargadas} asignaciones cargadas en ${r.mes} ${r.year}`, 'success'); } catch (err) { toast('Error: ' + err.message, 'error'); } } });
    document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 1000);
  }
  async function importarMaestro(after) {
    if (!window.XLSX) return toast('XLSX no disponible (sin conexión)', 'error');
    const inp = h('input', { type: 'file', accept: '.xlsx,.xls', style: { display: 'none' }, onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      toast('Procesando maestro…', '');
      try {
        const S = H.getState(); const impId = S.counters.importacion++; S.importaciones.push({ id: impId, fecha: new Date().toISOString(), archivo: f.name, resueltos: 0 });
        const parsed = await H.parsearMaestro(f); const res = H.compararMaestro(parsed, impId); H.save();
        toast(`Maestro conciliado · ${res.oficializados || 0} oficializadas (coinciden) · ${res.eventosSinteticos} importadas · ${res.autoCompletados} auto-completadas · ${res.conflictos} conflictos`, 'success');
        after && after();
      } catch (err) { toast('Error: ' + err.message, 'error'); }
    } });
    document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 1000);
  }

  // ============================ chrome (rail/topbar) ========================
  const railNav = h('div', { class: 'nav' });
  const navItems = {};
  function buildRail() {
    mount(railNav, h('div', { class: 'nav-group-lbl' }, 'Trabajo'),
      ...NAV.map(n => { const it = h('div', { class: 'nav-item', onclick: () => go(n.id) }, svg(ic[n.icon]), h('span', {}, n.label), h('span', { class: 'badge-count', style: { display: 'none' } })); navItems[n.id] = it; return it; }));
  }
  function syncNav() { for (const id in navItems) navItems[id].classList.toggle('active', id === view || (view === 'equipo' && id === 'equipos')); }
  function refreshChrome() {
    const S = H.getState();
    const counts = {
      pendientes: S.pendientes.filter(p => !p.anulado && p.estado !== 'cerrado').length,
      conciliacion: (S.conflictos || []).filter(c => c.estado === 'pendiente' || c.estado === 'pospuesto').length,
      ciclos: S.ciclos.filter(c => c.estado === 'abierto').length
    };
    for (const id in navItems) {
      const b = navItems[id].querySelector('.badge-count'); const n = counts[id];
      if (n) { b.textContent = n; b.style.display = ''; navItems[id].classList.toggle('alarm', id === 'conciliacion' && n > 0); } else b.style.display = 'none';
    }
    const ind = $('#state-ind'); if (ind) ind.textContent = `${S.__userActions || 0} cambios`;
  }

  function renderView() {
    const v = (VIEWS[view] || VIEWS.inicio);
    const node = v();
    mount($('#view'), node);
    const titles = { inicio: 'Cola de trabajo', equipos: 'Equipos', equipo: 'Ficha de equipo', pendientes: 'Pendientes', ciclos: 'Ciclos correctivos', eventos: 'Bitácora de eventos', asignaciones: 'Asignaciones MP', cumplimiento: 'Cumplimiento por servicio', conciliacion: 'Conciliación' };
    $('#tb-title').textContent = titles[view] || 'SIGEM';
  }

  // ============================ helpers final ===============================
  function MES_ESP(i) { return ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][i]; }
  window.MES_ESP = MES_ESP; // usado por algunas vistas

  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('sigem_theme', t); const b = $('#btn-theme'); if (b) mount(b, svg(t === 'dark' ? ic.sun : ic.moon, 16)); }

  // Recordatorio automático al abrir la app: avisa de pendientes vencidos y
  // recordatorios (proxRecord) para hoy, con acceso directo a revisarlos.
  function recordatoriosAlAbrir() {
    const S = H.getState(); const hoy = H.hoyLocal();
    const act = S.pendientes.filter(p => !p.anulado && p.estado !== 'cerrado');
    const vencidos = act.filter(p => p.fechaComp && p.fechaComp < hoy).length;
    const recordHoy = act.filter(p => p.proxRecord && p.proxRecord <= hoy).length;
    if (!vencidos && !recordHoy) return;
    const partes = [];
    if (vencidos) partes.push(`${vencidos} pendiente${vencidos !== 1 ? 's' : ''} vencido${vencidos !== 1 ? 's' : ''}`);
    if (recordHoy) partes.push(`${recordHoy} recordatorio${recordHoy !== 1 ? 's' : ''} para hoy`);
    toast('⏰ ' + partes.join(' · '), 'warn-backup', { label: 'Revisar', run: () => go('pendientes', (recordHoy && !vencidos) ? { record: 1 } : { vencidos: 1 }) });
  }

  // ============================ BOOT ========================================
  function boot() {
    if (window.XLSX) H.configure({ env: { xlsx: window.XLSX } });
    H.setSeed(window.SEED || {});
    H.bootstrapDatos();

    const app = h('div', { class: 'app' },
      h('aside', { class: 'rail' },
        h('div', { class: 'rail-top' }, h('div', { class: 'logo' }, h('span', { class: 'mark' }, 'S'), h('span', {}, 'SIGEM', h('br'), h('small', {}, 'Equipos críticos')))),
        railNav,
        h('div', { class: 'rail-foot' }, h('div', { class: 'u-avatar' }, 'C'), h('span', { class: 'u-name' }, 'Cristian'))),
      h('div', { class: 'main' },
        h('header', { class: 'topbar' },
          h('button', { class: 'btn icon ghost', title: 'Menú', onclick: () => document.querySelector('.app').classList.toggle('rail-collapsed') }, svg(ic.menu, 17)),
          h('div', { class: 'tb-title', id: 'tb-title' }, 'Cola de trabajo'),
          h('div', { class: 'tb-spacer' }),
          h('div', { class: 'search-pill', onclick: () => openCmdk() }, svg(ic.search, 15), h('span', { class: 'muted' }, 'Buscar…'), h('span', { class: 'kbd' }, '⌘K')),
          h('span', { class: 'pill muted', id: 'state-ind', title: 'Cambios desde el arranque' }, '0 cambios'),
          h('button', { class: 'btn icon ghost', id: 'btn-theme', title: 'Tema', onclick: () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark') }),
          h('button', { class: 'btn sm', title: 'Exportar Excel', onclick: excelExport }, '⤓ Excel'),
          h('button', { class: 'btn sm', title: 'Backup JSON', onclick: backupExport }, 'Backup'),
          h('button', { class: 'btn sm ghost', title: 'Importar backup', onclick: backupImport }, svg(ic.up, 15)),
        ),
        h('main', { class: 'view', id: 'view' })));
    mount(document.getElementById('root'), app);

    buildRail();
    applyTheme(localStorage.getItem('sigem_theme') || 'light');
    fromHash();
    renderView(); syncNav(); refreshChrome();
    setTimeout(recordatoriosAlAbrir, 600);

    window.addEventListener('hashchange', () => { fromHash(); renderView(); syncNav(); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); cmdkEl ? closeCmdk() : openCmdk(); }
      else if (e.key === 'Escape') { if (cmdkEl) closeCmdk(); else if (drawerOpen) closeDrawer(); else closePop(); }
      else if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !drawerOpen && !cmdkEl) { e.preventDefault(); openCmdk(); }
      else if ((e.key === 'j' || e.key === 'k') && kbList && !drawerOpen && !cmdkEl && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        const rows = [...document.querySelectorAll('#view table.dense tbody tr')]; if (!rows.length) return;
        kbList.idx = Math.max(0, Math.min((kbList.idx < 0 ? 0 : kbList.idx + (e.key === 'j' ? 1 : -1)), rows.length - 1));
        rows.forEach(r => r.classList.remove('kb-focus')); const r = rows[kbList.idx]; if (r) { r.classList.add('kb-focus'); r.scrollIntoView && r.scrollIntoView({ block: 'nearest' }); }
      }
      else if (e.key === 'Enter' && kbList && kbList.idx >= 0 && !drawerOpen && !cmdkEl && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { kbList.open(kbList.rows[kbList.idx]); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
