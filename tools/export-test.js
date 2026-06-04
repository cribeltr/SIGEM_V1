#!/usr/bin/env node
/****************************************************************************
 * Gestión Equipos Críticos HHHA · Test de regresión: "exportar = la vista".
 * --------------------------------------------------------------------------
 * Garantiza que al exportar se respeten los filtros de columna (embudos),
 * es decir, que el .xlsx contenga SOLO las filas visibles y no todo el set.
 * Nace de un bug real: el export "Por mes" reconstruía los 12 meses e
 * ignoraba los embudos → exportaba todo. Este test lo deja blindado.
 *
 * Estrategia: carga app.html en jsdom, va a Equipos · "Por mes", intercepta
 * XLSX.utils.aoa_to_sheet para contar las filas exportadas, exporta sin
 * filtro (total), luego filtra la columna "Mes" a un solo valor y exporta de
 * nuevo: el conteo exportado debe bajar y coincidir con lo que muestra la vista.
 *
 * Requisitos:  npm install --no-save jsdom
 * Uso:         node tools/export-test.js
 ****************************************************************************/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) { console.error('Falta jsdom. Instala con:  npm install --no-save jsdom'); process.exit(2); }

const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;
w.alert = () => {}; w.confirm = () => true; w.prompt = () => '';
// jsdom no implementa la descarga de Blob; basta con que no rompa (igual contamos antes de descargar).
w.URL.createObjectURL = () => 'blob:test'; w.URL.revokeObjectURL = () => {};

const checks = [];
const ok = (label, cond, extra) => { checks.push({ label, cond: !!cond }); if (extra) console.log('     ' + extra); };

// Captura el nº de filas de datos del último .xlsx exportado (aoa = [titulo, [], header, ...filas]).
let lastExportRows = null;
function hookExport() {
  const orig = w.XLSX.utils.aoa_to_sheet;
  w.XLSX.utils.aoa_to_sheet = function (aoa) { lastExportRows = Math.max(0, (aoa ? aoa.length : 0) - 3); return orig.apply(this, arguments); };
}
const clickByText = (sel, txt) => { const el = [...w.document.querySelectorAll(sel)].find(b => (b.textContent || '').trim() === txt); if (el) el.click(); return el; };
const exportar = () => { lastExportRows = null; clickByText('#view button', 'Exportar'); return lastExportRows; };
const visibleFilas = () => { const m = (w.document.querySelector('.count-note') || {}).textContent || ''; const n = m.match(/(\d+)\s*fila/); return n ? +n[1] : null; };

setTimeout(() => {
  try {
    ok('XLSX disponible (inline)', w.XLSX && w.XLSX.utils);
    hookExport();
    // Ir a Equipos → "Por mes"
    w.location.hash = '#equipos'; w.dispatchEvent(new w.Event('hashchange'));
    clickByText('#view .seg button', 'Por mes');

    const total = exportar();
    ok('exporta el total sin filtro', total > 0, `total exportado = ${total}`);

    // Abrir el embudo de la columna "Mes"
    const ths = [...w.document.querySelectorAll('#view table.dense thead th')];
    const thMes = ths.find(t => (t.querySelector('.th-lbl') || {}).textContent === 'Mes');
    ok('existe la columna "Mes" con embudo', thMes && thMes.querySelector('.funnel'));
    thMes.querySelector('.funnel').click();

    const panel = w.document.querySelector('.xfilter');
    ok('se abre el panel de filtro', !!panel);
    // Deseleccionar todo (la lista se re-renderiza) y marcar un solo mes.
    const fire = el => el.dispatchEvent(new w.Event('change', { bubbles: true }));
    const selAll = panel.querySelector('.xf-all input');
    selAll.checked = false; fire(selAll);                            // quita todos → re-render
    const firstRow = panel.querySelector('.xf-row input');          // re-consultar tras el re-render
    firstRow.checked = true; fire(firstRow);                        // marca uno → re-render
    const mesElegido = (panel.querySelector('.xf-row .xf-v') || {}).textContent || '?';
    [...panel.querySelectorAll('.xf-foot button')].find(b => b.textContent.trim() === 'Aceptar').click();

    const vis = visibleFilas();
    const filtrado = exportar();
    ok('el filtro reduce las filas visibles', vis != null && vis < total, `mes "${mesElegido}": visibles = ${vis} (antes ${total})`);
    ok('EXPORTA SOLO LA VISTA (export = visibles)', filtrado === vis, `exportado = ${filtrado} · visibles = ${vis}`);
    ok('export filtrado < total', filtrado > 0 && filtrado < total, `${filtrado} < ${total}`);
  } catch (e) { console.log('Excepción:', e.stack); ok('test sin excepción', false); }

  const fail = checks.filter(c => !c.cond);
  checks.forEach(c => console.log((c.cond ? 'OK   ' : 'FAIL ') + c.label));
  console.log(fail.length ? `\n*** EXPORT TEST: ${fail.length} fallo(s) ***` : '\n*** EXPORT TEST OK ***');
  process.exit(fail.length ? 1 : 0);
}, 800);
