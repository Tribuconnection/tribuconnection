/**
 * Backend de Google Sheets para los formularios de tribuconnection.com.
 *
 * Cada formulario deja su información en SU PROPIA pestaña, nombrada según
 * de dónde viene:
 *   - "Solicitar agregar evento"      -> pestaña "Eventos"
 *   - "Ser parte del Club Tribu"      -> pestaña "Club Tribu"
 *   - "Conectarme a la Tribu"         -> pestaña "Conectarme a la Tribu"
 *   - "Propuesta a medida"            -> pestaña "Propuestas"
 *   - "Conectar" (botón en un perfil público, perfil-publico/index.html) -> pestaña "Conectar"
 *   - Pedido de cambio de textos (portal del creador/a)     -> pestaña "Cambios de perfil"
 *
 * Además, "NotificarCambio" manda el mail a la persona cuando el equipo publica
 * o rechaza su pedido de cambio (desde /cuenta/admin-cambios/).
 *
 * "Publicar experiencia" (desde la cuenta de un usuario) es la excepción: no
 * va a esta planilla de Formularios, va a una planilla APARTE llamada
 * "Experiencias - Tribu Connection" (ver EXPERIENCIAS_SHEET_ID más abajo).
 *
 * Cada envío avisa por mail a contacto@tribuconnection.com.
 *
 * Ver INSTRUCCIONES.txt para el paso a paso de despliegue.
 */

const NOTIFY_EMAIL = 'contacto@tribuconnection.com';

/* Supabase: el Apps Script le pregunta a la base a quién avisar de un pedido de
   cambio ya resuelto (cambio_para_notificar).

   Esa función devuelve el MAIL de la persona y además marca el pedido como
   avisado, así que dejó de ser llamable con la clave pública: antes cualquiera
   que tuviera un id de pedido podía leer ese mail o quemar el aviso para que
   nunca saliera. Ahora pide la clave SECRETA (service_role).

   La clave NO va en este archivo: el repositorio es público. Vive en
   Configuración del proyecto (engranaje) → Propiedades del script, con el
   nombre SUPABASE_SECRET_KEY. Si falta, el aviso no sale y el panel del equipo
   deja reenviarlo. */
const SUPABASE_URL = 'https://dcoazdjqdohiekcsaxor.supabase.co';
const SITIO = 'https://www.tribuconnection.com';

function supabaseKey_() {
  return PropertiesService.getScriptProperties().getProperty('SUPABASE_SECRET_KEY') || '';
}

/* Planilla APARTE (no la de Formularios) donde se registra cada experiencia
   publicada desde "Publicar experiencia" en la cuenta de un usuario. Vive en
   el Drive del equipo, carpeta de Tribu Connection. */
const EXPERIENCIAS_SHEET_ID = '1YCMMVi6pgx0Fl2q4j8CXa1vSzuSkJiifIVoQy8tK9ME';
const EXPERIENCIAS_HEADERS = ['ID', 'Fecha de publicación', 'Nombre', 'Tipo', 'Fecha del evento', 'Horario', 'Modalidad', 'Ciudad/Barrio', 'Lugar', 'Categorías', 'Descripción', 'Forma de acceso', 'Estado', 'Publicado por'];

/* Una pestaña por destino, con el nombre de dónde viene la info y sus propias columnas. */
const TABS = {
  Evento:    { name: 'Eventos',               headers: ['Fecha de envío', 'Evento', 'Rubro', 'Fecha del evento', 'Ubicación', 'Lat', 'Lng', 'Etiquetas', 'Descripción', 'Link fotos/video', 'Adjuntos'] },
  Join:      { name: 'Club Tribu',            headers: ['Fecha de envío', 'Nombre', 'Ciudad / Barrio', 'Contacto', 'Newsletter'] },
  Conectar:  { name: 'Conectarme a la Tribu',  headers: ['Fecha de envío', 'Nombre', 'Perfil', 'Marca / Proyecto / Evento', 'Contacto', 'Detalles', 'Fecha de nacimiento', 'Provincia', 'Ciudad'] },
  Propuesta: { name: 'Propuestas',             headers: ['Fecha de envío', 'Nombre', 'Marca / Evento', 'Contacto', 'Detalles'] },
  Externo:   { name: 'Formulario externo',     headers: ['Fecha de envío', 'Nombre completo', 'Correo electrónico', 'Instagram', 'WhatsApp', 'Propuesta', 'Fecha y lugar del evento', 'Ayuda'] },
  /* La clave interna es ConectarPerfil (Conectar ya la usa "Conectarme a la
     Tribu"), pero la pestaña visible se llama "Conectar". */
  ConectarPerfil: { name: 'Conectar',           headers: ['Fecha de envío', 'Perfil consultado', 'Tipo de propuesta', 'Nombre', 'Proyecto / Marca', 'Email', 'WhatsApp', 'Fecha aproximada', 'Ciudad / País', 'Tipo de experiencia', 'Mensaje'] },
  CambioPerfil:   { name: 'Cambios de perfil',  headers: ['Fecha de envío', 'Perfil', 'Email de la cuenta', 'Landing', 'Qué cambia', 'Texto publicado', 'Texto propuesto', 'ID del pedido'] }
};

/* Pestañas que quedaron de esquemas anteriores y ya no se usan (el sitio ya no
   tiene planes pagos separados "Cafecito" / "Tribu Plus" — ahora es un único
   "Club Tribu"). limpiarPestanasObsoletas() las borra SOLO si están vacías. */
const PESTANAS_OBSOLETAS = ['Formularios', 'Tribu Pass', 'Sumate a la Tribu', 'Cafecito', 'Tribu Plus'];

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
    if (tipo === 'Externo') return handleExterno_(ss, e);
    if (tipo === 'ConectarPerfil') return handleConectarPerfil_(ss, e);
    if (tipo === 'Experiencia') return handleExperiencia_(e);
    if (tipo === 'CambioPerfil') return handleCambioPerfil_(ss, e);
    if (tipo === 'NotificarCambio') return handleNotificarCambio_(e);
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
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Ciudad_Barrio || '',
    e.parameter.Contacto || '', e.parameter.Newsletter || 'No'
  ];
  agregarFila_(ss, 'Join', row, 'Nuevo "Sumate al Club Tribu": ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

function handleConectar_(ss, e) {
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Perfil || '',
    e.parameter.Marca_Evento || '', e.parameter.Contacto || '', e.parameter.Detalles || '',
    e.parameter.Fecha_Nacimiento || '', e.parameter.Provincia || '', e.parameter.Ciudad || ''
  ];
  agregarFila_(ss, 'Conectar', row, 'Nuevo "Conectarme a la Tribu": ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

function handleConectarPerfil_(ss, e) {
  const row = [
    new Date(), e.parameter.Perfil || '', e.parameter.Tipo_Propuesta || '',
    e.parameter.Nombre || '', e.parameter.Proyecto || '', e.parameter.Email || '',
    e.parameter.WhatsApp || '', e.parameter.Fecha_Aprox || '', e.parameter.Ciudad || '',
    e.parameter.Tipo_Experiencia || '', e.parameter.Mensaje || ''
  ];
  agregarFila_(ss, 'ConectarPerfil', row, 'Nueva consulta para ' + (e.parameter.Perfil || '(perfil)') + ': ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

function handleCambioPerfil_(ss, e) {
  const p = e.parameter;
  const row = [new Date(), p.Perfil || '', p.Email || '', p.Link || '', p.Campo || '', p.Actual || '', p.Propuesto || '', p.Id || ''];
  getTab_(ss, 'CambioPerfil').appendRow(row);
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'Pedido de cambio de perfil: ' + (p.Perfil || '(perfil)') + ' — ' + (p.Campo || ''),
    body: TABS.CambioPerfil.headers.map((h, i) => h + ': ' + row[i]).join('\n') + '\n\nRevisalo y publicalo en ' + SITIO + '/cuenta/admin-cambios/'
  });
  return respond_({ ok: true });
}

/** Mail a la persona cuando su pedido se publicó o se rechazó. Los datos NO
    vienen de la web: se le piden a la base de datos con el ID del pedido, que
    solo los devuelve si el pedido ya está resuelto y todavía no se avisó. Así
    nadie puede usar esto para mandar mails a cualquiera, ni dos veces. */
function handleNotificarCambio_(e) {
  const id = String(e.parameter.Id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return respond_({ ok: false, error: 'ID inválido' });
  const key = supabaseKey_();
  if (!key) return respond_({ ok: false, error: 'Falta la propiedad SUPABASE_SECRET_KEY en el script' });
  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/cambio_para_notificar', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    payload: JSON.stringify({ p_id: id })
  });
  if (res.getResponseCode() !== 200) return respond_({ ok: false, error: 'Supabase ' + res.getResponseCode() });
  const d = JSON.parse(res.getContentText() || 'null');
  if (!d || !d.email) return respond_({ ok: false, error: 'Nada para avisar' });
  const mail = mailCambio_(d);
  MailApp.sendEmail({ to: d.email, subject: mail.asunto, htmlBody: mail.html, body: mail.texto, name: 'Tribu Connection', replyTo: NOTIFY_EMAIL });
  return respond_({ ok: true });
}

const CAMPOS_CAMBIO_ = { nombre: 'tu nombre público', nombre_marca: 'el nombre de tu marca', titulo_profesional: 'cómo te presentás', mini_bio: 'tu frase destacada', bio_larga: 'tu bio', que_esperar: 'la sección “Qué esperar”', otro: 'tu landing' };

function escHtml_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/** Mismo diseño que los mails de la cuenta (email-templates/): fondo oscuro, barra espectro, logo blanco. */
function mailCambio_(d) {
  const ok = d.estado === 'aplicado';
  const nombre = String(d.nombre || '').split(' ')[0] || 'hola';
  const que = CAMPOS_CAMBIO_[d.campo] || 'tu perfil';
  const landing = d.slug ? SITIO + '/' + d.slug + '/' : SITIO + '/red-tribu/';
  const portal = SITIO + '/cuenta/portal/';
  const titulo = ok ? '¡Tu cambio ya está publicado!' : 'Revisamos tu pedido de cambio';
  const intro = ok
    ? '¡Hola ' + escHtml_(nombre) + '! Ya aplicamos el cambio en ' + que + ' y ya se ve en tu landing de la Red Tribu.'
    : '¡Hola ' + escHtml_(nombre) + '! Revisamos el cambio que pediste en ' + que + ' y por ahora no lo publicamos.';
  const F = 'font-family:Arial,Helvetica,sans-serif;';
  const cita = d.campo !== 'otro' && d.valor
    ? '<tr><td style="padding:22px 40px 0 40px;"><div style="border-left:3px solid #36B7C4;background:#15171F;border-radius:10px;padding:14px 16px;' + F + 'font-size:14px;line-height:1.6;color:#F4F1EA;white-space:pre-line;">' + escHtml_(d.valor) + '</div></td></tr>' : '';
  const nota = d.nota
    ? '<tr><td style="padding:18px 40px 0 40px;"><p style="margin:0;' + F + 'font-size:14px;line-height:1.6;color:#C7C9D1;"><strong style="color:#F4F1EA;">Nota del equipo:</strong> ' + escHtml_(d.nota) + '</p></td></tr>' : '';
  const boton = ok ? ['Ver mi landing', landing] : ['Ir a mi portal', portal];
  const grad = 'linear-gradient(100deg,#D24B62 0%,#F4A623 27%,#9BCB46 52%,#36B7C4 76%,#9B7CB8 100%)';
  const html = '<!DOCTYPE html><html lang="es-AR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"></head>' +
    '<body style="margin:0;padding:0;background-color:#0C0D10;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0C0D10;padding:32px 16px;"><tr><td align="center">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#101218;border:1px solid rgba(255,255,255,.09);border-radius:18px;overflow:hidden;">' +
    '<tr><td style="height:5px;line-height:5px;font-size:0;background:' + grad + ';">&nbsp;</td></tr>' +
    '<tr><td align="center" style="padding:40px 40px 8px 40px;"><img src="' + SITIO + '/assets/logo-white-horizontal.png" width="180" alt="Tribu Connection" style="display:block;width:180px;max-width:60%;height:auto;border:0;"></td></tr>' +
    '<tr><td align="center" style="padding:24px 40px 0 40px;"><span style="' + F + 'font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#36B7C4;">Tu landing en la Red Tribu</span></td></tr>' +
    '<tr><td align="center" style="padding:10px 40px 0 40px;"><h1 style="margin:0;' + F + 'font-size:26px;line-height:1.3;font-weight:800;color:#F4F1EA;">' + titulo + '</h1></td></tr>' +
    '<tr><td align="center" style="padding:16px 40px 0 40px;"><p style="margin:0;' + F + 'font-size:15px;line-height:1.6;color:#C7C9D1;text-align:center;">' + intro + '</p></td></tr>' +
    cita + nota +
    '<tr><td align="center" style="padding:30px 40px 8px 40px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:999px;background:' + grad + ';"><a href="' + boton[1] + '" target="_blank" style="display:inline-block;padding:14px 34px;' + F + 'font-size:15px;font-weight:700;color:#15110F;text-decoration:none;border-radius:999px;">' + boton[0] + '</a></td></tr></table></td></tr>' +
    '<tr><td style="padding:32px 40px 0 40px;"><div style="border-top:1px solid rgba(255,255,255,.09);"></div></td></tr>' +
    '<tr><td align="center" style="padding:22px 40px 40px 40px;"><p style="margin:0 0 6px 0;' + F + 'font-size:12px;line-height:1.6;color:#8A8D98;">Tus placas para redes y tus textos están siempre en <a href="' + portal + '" style="color:#36B7C4;">tu portal</a>.</p>' +
    '<p style="margin:0;' + F + 'font-size:12px;line-height:1.6;color:#8A8D98;"><a href="' + SITIO + '" style="color:#8A8D98;text-decoration:underline;">tribuconnection.com</a> &nbsp;·&nbsp; <a href="mailto:' + NOTIFY_EMAIL + '" style="color:#8A8D98;text-decoration:underline;">' + NOTIFY_EMAIL + '</a></p></td></tr>' +
    '</table></td></tr></table></body></html>';
  const texto = titulo + '\n\n' + intro.replace(/<[^>]+>/g, '') + (d.valor && d.campo !== 'otro' ? '\n\n"' + d.valor + '"' : '') + (d.nota ? '\n\nNota del equipo: ' + d.nota : '') + '\n\n' + boton[0] + ': ' + boton[1];
  return { asunto: ok ? '✨ Tu cambio ya está publicado en Tribu Connection' : 'Revisamos tu pedido de cambio · Tribu Connection', html: html, texto: texto };
}

function handlePropuesta_(ss, e) {
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Marca_Evento || '',
    e.parameter.Contacto || '', e.parameter.Detalles || ''
  ];
  agregarFila_(ss, 'Propuesta', row, 'Nueva propuesta a medida: ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

function handleExterno_(ss, e) {
  const row = [
    new Date(), e.parameter.Nombre || '', e.parameter.Email || '',
    e.parameter.Instagram || '', e.parameter.WhatsApp || '',
    e.parameter.Propuesta || '', e.parameter.Fecha_Lugar || '', e.parameter.Ayuda || ''
  ];
  agregarFila_(ss, 'Externo', row, 'Nuevo formulario externo: ' + (e.parameter.Nombre || '(sin nombre)'));
  return respond_({ ok: true });
}

/** A diferencia del resto, esto NO va a la planilla de Formularios: va a la
    planilla aparte "Experiencias - Tribu Connection" en el Drive del equipo.
    Mantiene la planilla sincronizada con lo que pasa en la cuenta del usuario:
    Accion=crear agrega fila, Accion=editar la actualiza (buscando por ID),
    Accion=eliminar la borra. Así una edición o un borrado en la web se ve
    reflejado ahí también, no solo la creación. */
function handleExperiencia_(e) {
  const sh = SpreadsheetApp.openById(EXPERIENCIAS_SHEET_ID).getSheets()[0];
  const accion = (e.parameter.Accion || 'crear').trim();
  const id = e.parameter.Id || '';
  const filaExistente = id ? buscarFilaPorIdExperiencia_(sh, id) : null;

  if (accion === 'eliminar') {
    if (filaExistente) sh.deleteRow(filaExistente);
    return respond_({ ok: true });
  }

  const row = [
    id, new Date(), e.parameter.Nombre || '', e.parameter.TipoExp || '', e.parameter.Fecha || '',
    e.parameter.Horario || '', e.parameter.Modalidad || '', e.parameter.CiudadBarrio || '',
    e.parameter.Lugar || '', e.parameter.Categorias || '', e.parameter.Descripcion || '',
    e.parameter.Acceso || '', e.parameter.Estado || '', e.parameter.PublicadoPor || ''
  ];

  if (filaExistente) {
    sh.getRange(filaExistente, 1, 1, row.length).setValues([row]);
    return respond_({ ok: true });
  }

  sh.appendRow(row);
  MailApp.sendEmail(NOTIFY_EMAIL, 'Nueva experiencia publicada: ' + (e.parameter.Nombre || '(sin nombre)'),
    EXPERIENCIAS_HEADERS.map((h, i) => h + ': ' + row[i]).join('\n'));
  return respond_({ ok: true });
}

function buscarFilaPorIdExperiencia_(sh, id) {
  const total = sh.getLastRow() - 1;
  if (total <= 0) return null;
  const ids = sh.getRange(2, 1, total, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return null;
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
