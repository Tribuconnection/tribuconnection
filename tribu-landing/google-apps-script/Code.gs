/**
 * Backend de Google Sheets para los formularios de tribuconnection.com.
 *
 * Cada formulario deja su información en SU PROPIA pestaña, nombrada según
 * de dónde viene:
 *   - "Solicitar agregar evento"       -> pestaña "Eventos"
 *   - "Sumate a la Tribu" · Cafecito    -> pestaña "Cafecito"
 *   - "Sumate a la Tribu" · Tribu Plus  -> pestaña "Tribu Plus"
 *   - "Conectarme a la Tribu"           -> pestaña "Conectarme a la Tribu"
 *   - "Propuesta a medida"              -> pestaña "Propuestas"
 *
 * (El formulario de sumarse es uno solo; se separa por el plan elegido.
 *  Cualquier plan que no sea Cafecito —incluido "General"— va a "Tribu Plus";
 *  la columna "Plan" de esa pestaña dice cuál fue exactamente.)
 *
 * Cada envío avisa por mail a contacto@tribuconnection.com.
 *
 * Ver INSTRUCCIONES.txt para el paso a paso de despliegue.
 */

const NOTIFY_EMAIL = 'contacto@tribuconnection.com';

/* Una pestaña por destino, con el nombre de dónde viene la info y sus propias columnas. */
const JOIN_HEADERS = ['Fecha de envío', 'Nombre', 'Rubro', 'Perfil', 'Plan', 'Contacto', 'Detalles'];
const TABS = {
  Evento:    { name: 'Eventos',               headers: ['Fecha de envío', 'Evento', 'Rubro', 'Fecha del evento', 'Ubicación', 'Lat', 'Lng', 'Etiquetas', 'Descripción', 'Link fotos/video', 'Adjuntos'] },
  Cafecito:  { name: 'Cafecito',              headers: JOIN_HEADERS },
  TribuPlus: { name: 'Tribu Plus',            headers: JOIN_HEADERS },
  Conectar:  { name: 'Conectarme a la Tribu',  headers: ['Fecha de envío', 'Nombre', 'Perfil', 'Marca / Proyecto / Evento', 'Contacto', 'Detalles'] },
  Propuesta: { name: 'Propuestas',             headers: ['Fecha de envío', 'Nombre', 'Marca / Evento', 'Contacto', 'Detalles'] }
};

/* Pestañas que quedaron de esquemas anteriores y ya no se usan. */
const PESTANAS_OBSOLETAS = ['Formularios', 'Tribu Pass', 'Sumate a la Tribu'];

/** Ejecutar una sola vez desde el editor para crear la planilla y sus pestañas. */
function setup() {
  const ss = getSheet_();
  Object.keys(TABS).forEach(k => getTab_(ss, k));
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
  const primera = getTab_(ss, Object.keys(TABS)[0]);
  if (porDefecto && porDefecto.getSheetId() !== primera.getSheetId()) ss.deleteSheet(porDefecto);
  return ss;
}

/** Devuelve (creándola si hace falta) la pestaña del tipo de formulario dado. */
function getTab_(ss, key) {
  const conf = TABS[key];
  let sh = ss.getSheetByName(conf.name);
  if (!sh) {
    sh = ss.insertSheet(conf.name);
    sh.getRange(1, 1, 1, conf.headers.length).setValues([conf.headers]);
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

function agregarFila_(ss, key, row, asunto) {
  const sh = getTab_(ss, key);
  sh.appendRow(row);
  notify_(asunto, TABS[key].headers, row);
}

function handleEvento_(ss, e) {
  const adjuntos = [];
  if (e.files) {
    Object.keys(e.files).forEach(k => {
      const arr = Array.isArray(e.files[k]) ? e.files[k] : [e.files[k]];
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
  agregarFila_(ss, 'Evento', row, 'Nueva solicitud de evento: ' + (e.parameter.Evento || '(sin nombre)'));
  return respond_({ ok: true });
}

function handleJoin_(ss, e) {
  const plan = (e.parameter.Plan || 'General').trim();
  const key = plan === 'Cafecito' ? 'Cafecito' : 'TribuPlus';
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Rubro || '',
    e.parameter.Perfil || '', plan, e.parameter.Contacto || '', e.parameter.Detalles || ''
  ];
  agregarFila_(ss, key, row, 'Nuevo "Sumate a la Tribu" (' + plan + '): ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

function handleConectar_(ss, e) {
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Perfil || '',
    e.parameter.Marca_Evento || '', e.parameter.Contacto || '', e.parameter.Detalles || ''
  ];
  agregarFila_(ss, 'Conectar', row, 'Nuevo "Conectarme a la Tribu": ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

function handlePropuesta_(ss, e) {
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Marca_Evento || '',
    e.parameter.Contacto || '', e.parameter.Detalles || ''
  ];
  agregarFila_(ss, 'Propuesta', row, 'Nueva propuesta a medida: ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

/* ===================== MANTENIMIENTO (correr a mano desde el editor) =====================
   Estas funciones se ejecutan una vez desde el editor de Apps Script, NO por la web. */

/** Borra de TODAS las pestañas las filas de prueba (por marcadores conocidos). */
function limpiarPruebas() {
  const ss = getSheet_();
  const marcas = ['Prueba Claude', 'CORS check', 'E2E ', 'Test Propuesta', 'Evento Test', 'ACENTOS', 'QA verificacion', 'Marca QA'];
  let total = 0;
  ss.getSheets().forEach(sh => {
    const datos = sh.getDataRange().getDisplayValues();
    for (let i = datos.length - 1; i >= 1; i--) { // salteamos encabezados
      const texto = datos[i].join(' ');
      if (marcas.some(m => texto.indexOf(m) !== -1)) { sh.deleteRow(i + 1); total++; }
    }
  });
  Logger.log('Filas de prueba borradas: ' + total);
}

/** Borra las pestañas obsoletas SÓLO si están vacías (por seguridad, no toca las que tengan datos). */
function limpiarPestanasObsoletas() {
  const ss = getSheet_();
  let borradas = 0;
  PESTANAS_OBSOLETAS.forEach(nombre => {
    const sh = ss.getSheetByName(nombre);
    if (sh && sh.getLastRow() <= 1) { ss.deleteSheet(sh); borradas++; }
  });
  Logger.log('Pestañas obsoletas vacías borradas: ' + borradas + ' (las que tenían datos NO se tocaron)');
}

/* ===================== ADMINISTRACIÓN (remota, opcional) =====================
   Requiere la propiedad ADMIN_TOKEN en Configuración del proyecto → Propiedades
   del script. Si no existe, todas estas acciones quedan deshabilitadas. */
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
    limpiarPruebas();
    return respond_({ ok: true });
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
