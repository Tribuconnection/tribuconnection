/**
 * Backend de Google Sheets para los formularios de tribuconnection.com:
 * - Solicitar evento (calendario)
 * - Sumarme a la Tribu / Tribu Plus / Cafecito
 *
 * Ver INSTRUCCIONES.txt para el paso a paso de despliegue.
 */

const SHEET_NAMES = { EVENTOS: 'Eventos', TRIBU_PASS: 'Tribu Pass', CAFECITO: 'Cafecito', PROPUESTAS: 'Propuestas' };
const NOTIFY_EMAIL = 'contacto@tribuconnection.com';

const HEADERS = {
  'Eventos': ['Fecha de envío', 'Evento', 'Rubro', 'Fecha del evento', 'Ubicación', 'Lat', 'Lng', 'Etiquetas', 'Descripción', 'Link fotos/video', 'Adjuntos'],
  'Tribu Pass': ['Fecha de envío', 'Nombre', 'Rubro', 'Perfil', 'Plan', 'Contacto', 'Detalles'],
  'Cafecito': ['Fecha de envío', 'Nombre', 'Rubro', 'Perfil', 'Plan', 'Contacto', 'Detalles'],
  'Propuestas': ['Fecha de envío', 'Nombre', 'Marca / Evento', 'Contacto', 'Detalles']
};

/** Ejecutar una sola vez desde el editor de Apps Script para crear la planilla. */
function setup() {
  const ss = getSheet_();
  Logger.log('Planilla lista: ' + ss.getUrl());
}

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  let ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { id = null; }
  }
  const esNueva = !id;
  if (esNueva) {
    ss = SpreadsheetApp.create('Tribu Connection - Formularios');
    props.setProperty('SHEET_ID', ss.getId());
  }
  const porDefecto = esNueva ? ss.getSheets()[0] : null;
  Object.keys(HEADERS).forEach(name => getOrCreateSheet_(ss, name));
  if (porDefecto) ss.deleteSheet(porDefecto);
  return ss;
}

function getOrCreateSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  try {
    const ss = getSheet_();
    const tipo = (e.parameter.Tipo || '').trim();
    if (tipo === 'Evento') return handleEvento_(ss, e);
    if (tipo === 'Join') return handleJoin_(ss, e);
    if (tipo === 'Propuesta') return handlePropuesta_(ss, e);
    if (tipo === 'Admin') return handleAdmin_(ss, e);
    return respond_({ ok: false, error: 'Tipo desconocido' });
  } catch (err) {
    return respond_({ ok: false, error: String(err) });
  }
}

function handleEvento_(ss, e) {
  const sheet = getOrCreateSheet_(ss, SHEET_NAMES.EVENTOS);
  const adjuntos = [];
  if (e.files) {
    Object.keys(e.files).forEach(key => {
      const arr = Array.isArray(e.files[key]) ? e.files[key] : [e.files[key]];
      arr.forEach(file => {
        if (file && file.getBytes && file.getBytes().length) {
          const folder = getAttachmentsFolder_();
          const saved = folder.createFile(file);
          saved.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          adjuntos.push(saved.getUrl());
        }
      });
    });
  }
  const row = [
    new Date(), e.parameter.Evento || '', e.parameter.Rubro || '', e.parameter.Fecha || '',
    e.parameter.Ubicacion || '', e.parameter.Ubicacion_lat || '', e.parameter.Ubicacion_lng || '',
    e.parameter.Etiquetas || '', e.parameter.Descripcion || '', e.parameter.Link_media || '',
    adjuntos.join(', ')
  ];
  sheet.appendRow(row);
  notify_('Nueva solicitud de evento: ' + (e.parameter.Evento || '(sin nombre)'), HEADERS.Eventos, row);
  return respond_({ ok: true });
}

function handleJoin_(ss, e) {
  const plan = (e.parameter.Plan || 'General').trim();
  const sheetName = plan === 'Cafecito' ? SHEET_NAMES.CAFECITO : SHEET_NAMES.TRIBU_PASS;
  const sheet = getOrCreateSheet_(ss, sheetName);
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Rubro || '',
    e.parameter.Perfil || '', plan, e.parameter.Contacto || '', e.parameter.Detalles || ''
  ];
  sheet.appendRow(row);
  notify_('Nuevo registro en "' + sheetName + '": ' + (e.parameter.Nombre || '(sin nombre)'), HEADERS[sheetName], row);
  return respond_({ ok: true });
}

function handlePropuesta_(ss, e) {
  const sheet = getOrCreateSheet_(ss, SHEET_NAMES.PROPUESTAS);
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Marca_Evento || '',
    e.parameter.Contacto || '', e.parameter.Detalles || ''
  ];
  sheet.appendRow(row);
  notify_('Nueva propuesta a medida: ' + (e.parameter.Nombre || '(sin nombre)'), HEADERS[SHEET_NAMES.PROPUESTAS], row);
  return respond_({ ok: true });
}

/* ===================== ADMINISTRACIÓN =====================
   Permite leer y corregir la planilla de forma remota (mantenimiento).
   La clave NO va en este archivo: se guarda en Configuración del proyecto →
   Propiedades del script → ADMIN_TOKEN. Si esa propiedad no existe, todas
   estas acciones quedan deshabilitadas. */
function handleAdmin_(ss, e) {
  const esperado = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (!esperado) return respond_({ ok: false, error: 'Administración deshabilitada (falta ADMIN_TOKEN)' });
  if (!tokenValido_(e.parameter.Token || '', esperado)) return respond_({ ok: false, error: 'No autorizado' });

  const accion = (e.parameter.Accion || '').trim();
  const hoja = (e.parameter.Hoja || '').trim();

  if (accion === 'hojas') {
    return respond_({ ok: true, hojas: ss.getSheets().map(s => s.getName()) });
  }

  if (accion === 'leer') {
    const sh = ss.getSheetByName(hoja);
    if (!sh) return respond_({ ok: false, error: 'No existe la hoja: ' + hoja });
    return respond_({ ok: true, filas: sh.getDataRange().getDisplayValues() });
  }

  if (accion === 'borrarFilas') {
    const sh = ss.getSheetByName(hoja);
    if (!sh) return respond_({ ok: false, error: 'No existe la hoja: ' + hoja });
    // De mayor a menor para que borrar una fila no corra el número de las siguientes.
    const filas = String(e.parameter.Filas || '').split(',')
      .map(n => parseInt(n.trim(), 10))
      .filter(n => n > 1) // la fila 1 son los encabezados
      .sort((a, b) => b - a);
    filas.forEach(n => { if (n <= sh.getLastRow()) sh.deleteRow(n); });
    return respond_({ ok: true, borradas: filas.length });
  }

  if (accion === 'editarCelda') {
    const sh = ss.getSheetByName(hoja);
    if (!sh) return respond_({ ok: false, error: 'No existe la hoja: ' + hoja });
    const fila = parseInt(e.parameter.Fila, 10);
    const col = parseInt(e.parameter.Columna, 10);
    if (!(fila > 0 && col > 0)) return respond_({ ok: false, error: 'Fila/Columna inválidas' });
    sh.getRange(fila, col).setValue(e.parameter.Valor || '');
    return respond_({ ok: true });
  }

  if (accion === 'limpiarPruebas') {
    const marcas = ['Prueba Claude', 'CORS check', 'E2E ', 'Test Propuesta', 'Evento Test', 'ACENTOS'];
    let total = 0;
    ss.getSheets().forEach(sh => {
      const datos = sh.getDataRange().getDisplayValues();
      for (let i = datos.length - 1; i >= 1; i--) { // salteamos encabezados
        const texto = datos[i].join(' ');
        if (marcas.some(m => texto.indexOf(m) !== -1)) { sh.deleteRow(i + 1); total++; }
      }
    });
    return respond_({ ok: true, borradas: total });
  }

  return respond_({ ok: false, error: 'Acción desconocida' });
}

/** Comparación a tiempo constante: no revela la clave carácter por carácter. */
function tokenValido_(recibido, esperado) {
  if (recibido.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= recibido.charCodeAt(i) ^ esperado.charCodeAt(i);
  return dif === 0;
}

function getAttachmentsFolder_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recrear abajo */ } }
  const folder = DriveApp.createFolder('Tribu Connection - Adjuntos de eventos');
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function notify_(subject, headers, row) {
  const body = headers.map((h, i) => h + ': ' + row[i]).join('\n');
  MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
