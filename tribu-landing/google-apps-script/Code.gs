/**
 * Backend de Google Sheets para los formularios de tribuconnection.com:
 * - Solicitar evento (calendario)
 * - Sumarme a la Tribu / Tribu Plus / Cafecito (home + club-tribu-connection)
 * - Conectarme a la Tribu (creador o marca)
 * - Propuesta a medida
 *
 * Todos los formularios escriben en UNA sola hoja ("Formularios"), en orden
 * cronológico, con una columna "Tipo" para distinguir de cuál vinieron.
 *
 * Ver INSTRUCCIONES.txt para el paso a paso de despliegue.
 */

const SHEET_NAME = 'Formularios';
const NOTIFY_EMAIL = 'contacto@tribuconnection.com';

const HEADERS = [
  'Fecha de envío', 'Tipo', 'Nombre', 'Contacto', 'Perfil', 'Rubro',
  'Marca / Evento / Proyecto', 'Plan', 'Detalles',
  'Fecha del evento', 'Ubicación', 'Lat', 'Lng', 'Etiquetas', 'Link fotos/video', 'Adjuntos'
];

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
  const sh = getOrCreateSheet_(ss);
  if (porDefecto && porDefecto.getSheetId() !== sh.getSheetId()) ss.deleteSheet(porDefecto);
  return ss;
}

function getOrCreateSheet_(ss) {
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
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
    if (tipo === 'Conectar') return handleConectar_(ss, e);
    if (tipo === 'Propuesta') return handlePropuesta_(ss, e);
    if (tipo === 'Admin') return handleAdmin_(ss, e);
    return respond_({ ok: false, error: 'Tipo desconocido' });
  } catch (err) {
    return respond_({ ok: false, error: String(err) });
  }
}

/** Arma una fila completa (16 columnas) a partir de un objeto parcial { columna: valor }. */
function armarFila_(tipo, datos) {
  const porNombre = Object.assign({
    'Fecha de envío': new Date(),
    'Tipo': tipo
  }, datos);
  return HEADERS.map(h => porNombre[h] !== undefined ? porNombre[h] : '');
}

function agregarFila_(ss, tipo, datos, asuntoLog) {
  const sheet = getOrCreateSheet_(ss);
  const row = armarFila_(tipo, datos);
  sheet.appendRow(row);
  notify_(asuntoLog, row);
}

function handleEvento_(ss, e) {
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
  agregarFila_(ss, 'Evento', {
    'Marca / Evento / Proyecto': e.parameter.Evento || '',
    'Rubro': e.parameter.Rubro || '',
    'Fecha del evento': e.parameter.Fecha || '',
    'Ubicación': e.parameter.Ubicacion || '',
    'Lat': e.parameter.Ubicacion_lat || '',
    'Lng': e.parameter.Ubicacion_lng || '',
    'Etiquetas': e.parameter.Etiquetas || '',
    'Detalles': e.parameter.Descripcion || '',
    'Link fotos/video': e.parameter.Link_media || '',
    'Adjuntos': adjuntos.join(', ')
  }, 'Nueva solicitud de evento: ' + (e.parameter.Evento || '(sin nombre)'));
  return respond_({ ok: true });
}

function handleJoin_(ss, e) {
  const plan = (e.parameter.Plan || 'General').trim();
  agregarFila_(ss, 'Join', {
    'Nombre': e.parameter.Nombre || '',
    'Contacto': e.parameter.Contacto || '',
    'Perfil': e.parameter.Perfil || '',
    'Rubro': e.parameter.Rubro || '',
    'Plan': plan,
    'Detalles': e.parameter.Detalles || ''
  }, 'Nuevo registro "Sumarme a la Tribu" (' + plan + '): ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

function handleConectar_(ss, e) {
  agregarFila_(ss, 'Conectar', {
    'Nombre': e.parameter.Nombre || '',
    'Contacto': e.parameter.Contacto || '',
    'Perfil': e.parameter.Perfil || '',
    'Marca / Evento / Proyecto': e.parameter.Marca_Evento || '',
    'Detalles': e.parameter.Detalles || ''
  }, 'Nuevo "Conectarme a la Tribu": ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

function handlePropuesta_(ss, e) {
  agregarFila_(ss, 'Propuesta', {
    'Nombre': e.parameter.Nombre || '',
    'Contacto': e.parameter.Contacto || '',
    'Marca / Evento / Proyecto': e.parameter.Marca_Evento || '',
    'Detalles': e.parameter.Detalles || ''
  }, 'Nueva propuesta a medida: ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

/* ===================== MIGRACIÓN (una sola vez) =====================
   Si ya tenías datos en las pestañas viejas (Eventos, Tribu Pass, Cafecito,
   Propuestas), corré esta función UNA VEZ desde el editor ("migrarHojasViejas")
   para volcarlos a la hoja única "Formularios". Las pestañas viejas no se
   borran: quedan renombradas como archivo y ocultas, por las dudas. */
function migrarHojasViejas() {
  const ss = getSheet_();
  const destino = getOrCreateSheet_(ss);
  let migradas = 0;

  const mapas = [
    { nombre: 'Eventos', tipo: 'Evento', mapear: r => ({
        'Fecha de envío': r[0], 'Marca / Evento / Proyecto': r[1], 'Rubro': r[2],
        'Fecha del evento': r[3], 'Ubicación': r[4], 'Lat': r[5], 'Lng': r[6],
        'Etiquetas': r[7], 'Detalles': r[8], 'Link fotos/video': r[9], 'Adjuntos': r[10]
      }) },
    { nombre: 'Tribu Pass', tipo: 'Join', mapear: r => ({
        'Fecha de envío': r[0], 'Nombre': r[1], 'Rubro': r[2], 'Perfil': r[3],
        'Plan': r[4], 'Contacto': r[5], 'Detalles': r[6]
      }) },
    { nombre: 'Cafecito', tipo: 'Join', mapear: r => ({
        'Fecha de envío': r[0], 'Nombre': r[1], 'Rubro': r[2], 'Perfil': r[3],
        'Plan': r[4], 'Contacto': r[5], 'Detalles': r[6]
      }) },
    { nombre: 'Propuestas', tipo: 'Propuesta', mapear: r => ({
        'Fecha de envío': r[0], 'Nombre': r[1], 'Marca / Evento / Proyecto': r[2],
        'Contacto': r[3], 'Detalles': r[4]
      }) }
  ];

  mapas.forEach(({ nombre, tipo, mapear }) => {
    const sh = ss.getSheetByName(nombre);
    if (!sh || sh.getSheetId() === destino.getSheetId()) return;
    const datos = sh.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) { // salteamos encabezados
      if (datos[i].join('') === '') continue; // fila vacía
      destino.appendRow(armarFila_(tipo, mapear(datos[i])));
      migradas++;
    }
    sh.hideSheet();
    if (!nombre.includes('(archivo)')) sh.setName(nombre + ' (archivo)');
  });

  // Reordena todo por fecha de envío para que quede cronológico.
  const ultimaFila = destino.getLastRow();
  if (ultimaFila > 2) {
    destino.getRange(2, 1, ultimaFila - 1, HEADERS.length).sort({ column: 1, ascending: true });
  }

  Logger.log('Migradas ' + migradas + ' filas a "' + SHEET_NAME + '".');
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
  const hoja = (e.parameter.Hoja || SHEET_NAME).trim();

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

function notify_(subject, row) {
  const body = HEADERS.map((h, i) => h + ': ' + row[i]).join('\n');
  MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
