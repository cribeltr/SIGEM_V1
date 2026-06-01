/****************************************************************************
 * SIGEM · Backend de almacenamiento en Google Sheets (Apps Script Web App)
 * --------------------------------------------------------------------------
 * Guarda el estado de SIGEM (JSON comprimido) en una hoja OCULTA `_SIGEM_DATA`
 * y escribe además las hojas de trabajo legibles que envía la app (para poder
 * trabajar con el archivo aunque no se tenga el programa).
 *
 * CÓMO INSTALARLO
 *   1. Crea (o abre) un Google Sheet nuevo para SIGEM.
 *   2. Menú  Extensiones → Apps Script.  Borra el contenido y pega este archivo.
 *   3. (Opcional) define un token compartido: edita SHARED_TOKEN abajo con una
 *      clave secreta (la misma que pondrás en la app). Déjalo '' para acceso libre.
 *   4. Implementar → Nueva implementación → tipo "Aplicación web".
 *        · Ejecutar como: Yo
 *        · Quién tiene acceso: Cualquiera
 *      Copia la URL .../exec y pégala en SIGEM → Configuración.
 *   5. La primera vez te pedirá autorizar permisos sobre la hoja: acepta.
 *
 * Reimplementa (Implementar → Gestionar implementaciones → editar → Nueva versión)
 * cada vez que cambies este código.
 ****************************************************************************/

var SHARED_TOKEN = '';            // ← pon aquí una clave y la misma en la app (o deja '' = abierto)
var DATA_SHEET   = '_SIGEM_DATA'; // hoja de sistema (oculta) con el JSON comprimido
var META_SHEET   = '_SIGEM_META'; // hoja de sistema (oculta) con metadatos
var CHUNK        = 45000;         // tamaño de trozo por celda (límite de celda: 50.000)

function doGet(e) {
  try {
    e = e || {}; var p = e.parameter || {};
    if (p.api === 'read') {                       // modo HTTP: la app abierta FUERA de Apps Script
      if (!okToken(p.token)) return _json({ ok: false, error: 'token invalido' });
      return _json({ ok: true, dataB64: readData(), updated: readMeta('updated') });
    }
    // Por defecto: SERVIR LA APP (verla desde cualquier parte con la URL .../exec).
    try {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('SIGEM · Equipos Biomédicos Críticos')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (e2) {
      return HtmlService.createHtmlOutput('<h2 style="font-family:sans-serif">Falta el archivo <b>Index.html</b></h2>' +
        '<p style="font-family:sans-serif">Crea un archivo HTML llamado <b>Index</b> en este proyecto de Apps Script y pega el contenido de <code>app.html</code>. Luego reimplementa. Detalle: ' + e2 + '</p>');
    }
  } catch (err) { return _json({ ok: false, error: String(err) }); }
}

/* API para google.script.run — la usa la app cuando se sirve desde este Apps
 * Script (mismo origen, sin CORS). El control de acceso lo da la implementación. */
function apiRead() { return { ok: true, dataB64: readData(), updated: readMeta('updated') }; }
function apiSaveData(dataB64) { writeData(String(dataB64 || '')); writeMeta('updated', new Date().toISOString()); return { ok: true, ts: new Date().toISOString() }; }
function apiSaveSheets(sheets) { writeSheets(sheets || []); hideSystemSheets(); return { ok: true }; }
// Guarda en una sola llamada: estado del sistema (oculto) + hojas legibles visibles.
function apiSave(payload) {
  payload = payload || {};
  if (typeof payload.dataB64 === 'string') { writeData(payload.dataB64); writeMeta('updated', new Date().toISOString()); }
  if (Array.isArray(payload.sheets)) writeSheets(payload.sheets);
  hideSystemSheets();
  return { ok: true, ts: new Date().toISOString() };
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!okToken(body.token)) return _json({ ok: false, error: 'token invalido' });
    if (typeof body.dataB64 === 'string') { writeData(body.dataB64); writeMeta('updated', new Date().toISOString()); }
    if (Array.isArray(body.sheets)) writeSheets(body.sheets);
    hideSystemSheets();
    return _json({ ok: true, ts: new Date().toISOString() });
  } catch (err) { return _json({ ok: false, error: String(err) }); }
}

/* ----------------------------- helpers ---------------------------------- */
function _json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function okToken(t) { return !SHARED_TOKEN || String(t || '') === SHARED_TOKEN; }
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheetByName(name, create) {
  var sh = ss().getSheetByName(name);
  if (!sh && create) sh = ss().insertSheet(name);
  return sh;
}

function readData() {
  var sh = sheetByName(DATA_SHEET, false);
  if (!sh) return '';
  var last = sh.getLastRow();
  if (last < 1) return '';
  var vals = sh.getRange(1, 1, last, 1).getValues();
  return vals.map(function (r) { return r[0]; }).join('');
}
function writeData(b64) {
  var sh = sheetByName(DATA_SHEET, true);
  sh.clear();
  var chunks = [];
  for (var i = 0; i < b64.length; i += CHUNK) chunks.push([b64.substr(i, CHUNK)]);
  if (!chunks.length) chunks = [['']];
  sh.getRange(1, 1, chunks.length, 1).setValues(chunks);
  sh.hideSheet();
}
function readMeta(k) {
  var sh = sheetByName(META_SHEET, false); if (!sh) return '';
  var v = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 2).getValues();
  for (var i = 0; i < v.length; i++) if (v[i][0] === k) return v[i][1];
  return '';
}
function writeMeta(k, val) {
  var sh = sheetByName(META_SHEET, true);
  var v = sh.getLastRow() ? sh.getRange(1, 1, sh.getLastRow(), 2).getValues() : [];
  var found = false;
  for (var i = 0; i < v.length; i++) if (v[i][0] === k) { v[i][1] = val; found = true; }
  if (!found) v.push([k, val]);
  sh.clear(); sh.getRange(1, 1, v.length, 2).setValues(v); sh.hideSheet();
}

// Escribe las hojas de trabajo legibles que envía la app: [{name, rows:[[...]], hidden}]
function writeSheets(sheets) {
  sheets.forEach(function (spec) {
    if (!spec || !spec.name) return;
    var sh = sheetByName(spec.name, true);
    sh.clear();
    var rows = spec.rows || [];
    if (rows.length) {
      var maxc = 1;
      rows.forEach(function (r) { if (r.length > maxc) maxc = r.length; });
      var norm = rows.map(function (r) { var a = r.slice(); while (a.length < maxc) a.push(''); return a; });
      sh.getRange(1, 1, norm.length, maxc).setValues(norm);
      sh.setFrozenRows(spec.headerRow || 1);
    }
    if (spec.hidden || spec.name.charAt(0) === '_') sh.hideSheet(); else sh.showSheet();
  });
}

function hideSystemSheets() {
  ss().getSheets().forEach(function (sh) { if (sh.getName().charAt(0) === '_') sh.hideSheet(); });
}
