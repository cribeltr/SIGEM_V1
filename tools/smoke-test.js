#!/usr/bin/env node
/****************************************************************************
 * Gestión Equipos Críticos HHHA · Smoke test del panel construido.
 * --------------------------------------------------------------------------
 * Carga app.html en un DOM headless (jsdom), arranca con la SEMILLA embebida
 * (sin archivos externos) y verifica que el panel (Resumen · Datos · Ficha)
 * levanta sobre datos reales del motor y opera sin errores.
 * No prueba lógica de negocio a fondo: detecta regresiones de "no arranca".
 *
 * Requisitos:  npm install --no-save jsdom
 * Uso:         npm test     (o)     node tools/smoke-test.js
 ****************************************************************************/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch (e) {
  console.error('Falta jsdom. Instala con:  npm install --no-save jsdom');
  process.exit(2);
}

const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  beforeParse(w) {
    // jsdom no tiene canvas; Chart.js queda inerte (el panel lo envuelve en try/catch).
    w.HTMLCanvasElement.prototype.getContext = () => null;
  }
});
const w = dom.window;
w.alert = () => {}; w.confirm = () => true; w.prompt = () => '';

const errs = [];
w.addEventListener('error', e => errs.push(e.message || String(e.error)));

const checks = [];
const ok = (label, cond) => checks.push({ label, cond: !!cond });

setTimeout(() => {
  try {
    const d = w.document;

    // 1) Motor disponible y arrancado desde la semilla.
    ok('HHHA disponible', w.HHHA && typeof w.HHHA.getState === 'function');
    const S = w.HHHA.getState();
    ok('estado inicial con equipos (semilla)', S && Array.isArray(S.equipos) && S.equipos.length > 0);
    ok('catálogo de 12 meses (HHHA.MESES)', Array.isArray(w.HHHA.MESES) && w.HHHA.MESES.length === 12);

    // 2) Cabecera y navegación del panel montadas.
    ok('cabecera montada (.head)', !!d.querySelector('.head'));
    ok('navegación de 3 vistas', d.querySelectorAll('.nav button').length === 3);

    // 3) RESUMEN: 6 KPIs, conteo total y tablas de alerta.
    ok('6 KPIs en Resumen', d.querySelectorAll('#kpis .kpi').length === 6);
    const tot = parseInt((d.getElementById('totalEq') || {}).textContent, 10);
    ok('total de equipos > 0', tot > 0);
    ok('tabla "no operativos" presente', !!d.getElementById('tblNoOp'));
    ok('tabla "servicio técnico" presente', !!d.getElementById('tblSt'));

    // 4) DATOS: al abrir, se arman las pestañas y la tabla.
    const datosBtn = [...d.querySelectorAll('.nav button')].find(b => b.dataset.view === 'datos');
    datosBtn && datosBtn.click();
    const tabs = d.querySelectorAll('#tabs2 .tab2').length;
    ok('Datos: ≥ 8 hojas de datos', tabs >= 8);
    ok('Datos: columnas en la tabla', d.querySelectorAll('#headRow th').length > 0);
    ok('Datos: filas en la página', d.querySelectorAll('#bodyRows tr').length > 0);

    // 5) FICHA: buscar abre la ficha unificada de un equipo.
    const fichaBtn = [...d.querySelectorAll('.nav button')].find(b => b.dataset.view === 'ficha');
    fichaBtn && fichaBtn.click();
    const inv = S.equipos[0].inv;
    const f = d.getElementById('fSearch');
    f.value = inv; f.dispatchEvent(new w.Event('input'));
    const sg = d.querySelectorAll('.sg-item[data-inv]');
    ok('Ficha: el buscador sugiere equipos', sg.length > 0);
    sg[0] && sg[0].click();
    ok('Ficha: se abre la hoja del equipo', !!d.querySelector('#ficha .f-hero'));

    // 6) Sin errores de runtime capturados en window.
    ok('sin errores de runtime', errs.length === 0);
  } catch (e) {
    errs.push('Excepción en el test: ' + e.message);
    ok('test sin excepción', false);
  }

  const fail = checks.filter(c => !c.cond);
  checks.forEach(c => console.log((c.cond ? 'OK   ' : 'FAIL ') + c.label));
  if (errs.length) { console.log('\nErrores capturados:'); errs.slice(0, 8).forEach(m => console.log('  · ' + m)); }
  console.log(fail.length ? `\n*** SMOKE TEST: ${fail.length} fallo(s) ***` : '\n*** SMOKE TEST OK ***');
  process.exit(fail.length ? 1 : 0);
}, 800);
