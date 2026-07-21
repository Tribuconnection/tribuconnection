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
