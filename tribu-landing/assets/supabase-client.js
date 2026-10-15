/* Cliente compartido de Supabase para toda la web.
   La "publishable key" es segura para exponer en el navegador (está pensada
   para eso, como una API key pública) — el control de acceso real vive en las
   políticas de Row Level Security de cada tabla, no en ocultar esta clave. */
const SUPABASE_URL = 'https://dcoazdjqdohiekcsaxor.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zC1SJUG-5kHTWArEgYIqBw_tuYEqwOf';
/* Se lee ANTES de crear el cliente: el cliente limpia el hash de la URL al
   procesar el token, y necesitamos saber si se llegó desde el mail de
   confirmación de cuenta para mandar a la persona al paso 2. */
const TRIBU_VIENE_DE_CONFIRMAR = /type=signup/.test(location.hash);
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* Cuando alguien clickea el link de "recuperar contraseña" del mail,
   Supabase detecta el token en el hash de la URL automáticamente (en
   cualquier página — depende de la Redirect URL configurada en el proyecto,
   que hoy es la home) y dispara este evento. Lo mandamos al perfil con un
   flag para que abra ahí el popup de "elegí tu nueva contraseña", en vez de
   dejarlo logueado y perdido en la home sin ningún indicio de qué hacer. */
sb.auth.onAuthStateChange((event, session) => {
  if(event === 'PASSWORD_RECOVERY' && location.pathname !== '/cuenta/perfil/'){
    window.location.replace('/cuenta/perfil/?recuperar=1');
    return;
  }
  /* Volvió del link "confirmá tu cuenta" del mail: sigue con el paso 2. */
  if(event === 'SIGNED_IN' && TRIBU_VIENE_DE_CONFIRMAR && session){
    tribuDestinoPostAuth(session).then(dest => { if(location.pathname !== dest) window.location.replace(dest); });
  }
});

/* Registro con un correo que ya tiene cuenta: Supabase responde "ok" igual
   (para no revelar qué correos están registrados) pero NO manda ningún mail.
   Se reconoce porque el usuario vuelve sin identidades. Sin este chequeo la
   persona veía "revisá tu correo" y se quedaba esperando un mail que nunca
   iba a llegar. */
function tribuEsRegistroRepetido(data){
  return !!(data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
}
const TRIBU_MSG_REPETIDO = 'Ya tenés una cuenta con este correo. Ingresá con tu contraseña o, si no la recordás, tocá "¿Olvidaste tu contraseña?" y te mandamos un link para elegir una nueva.';

/* "¿Olvidaste tu contraseña?": manda el mail de recuperación. El link vuelve
   al sitio y el evento PASSWORD_RECOVERY de arriba lleva a elegir la nueva.
   Cualquier botón con data-olvide="#inputDelCorreo" (y opcional
   data-olvide-msg="#dondeAvisar") funciona sin más cableado. */
async function tribuPedirNuevaClave(email){
  return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-olvide]');
  if(!b) return;
  e.preventDefault();
  const input = document.querySelector(b.dataset.olvide);
  const msg = b.dataset.olvideMsg ? document.querySelector(b.dataset.olvideMsg) : null;
  const avisar = (t, ok) => {
    if(!msg){ alert(t); return; }
    msg.textContent = t; msg.style.display = 'block';
    msg.style.color = ok ? 'var(--green, #9BCB46)' : '';
  };
  const email = (input && input.value || '').trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){ avisar('Escribí tu correo en el campo de arriba y volvé a tocar "¿Olvidaste tu contraseña?".'); input && input.focus(); return; }
  const txt = b.textContent; b.disabled = true; b.textContent = 'Enviando…';
  const { error } = await tribuPedirNuevaClave(email);
  b.disabled = false; b.textContent = txt;
  if(error && /rate|seconds|many/i.test(error.message)){ avisar('Ya te mandamos un link hace muy poco. Esperá unos minutos y revisá también la carpeta de spam.'); return; }
  if(error){ avisar('No pudimos mandar el mail. Probá de nuevo en un rato.'); return; }
  avisar('Listo: si hay una cuenta con ' + email + ', te llega un mail para elegir una contraseña nueva. Revisá también spam o promociones.', true);
});

/* Agrega el link "¿Olvidaste tu contraseña?" debajo del error de cada
   formulario de ingreso (el modal de ingreso está repetido en muchas páginas;
   así no hay que tocarlas una por una). */
function tribuSumarOlvide(errId, emailId){
  const err = document.getElementById(errId);
  if(!err || err.parentNode.querySelector('[data-olvide]')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'olvide-link';
  b.dataset.olvide = '#' + emailId; b.dataset.olvideMsg = '#' + errId;
  b.textContent = '¿Olvidaste tu contraseña?';
  b.style.cssText = 'background:none;border:0;padding:0;margin:.2rem 0 .8rem;color:var(--soft);font:inherit;font-size:.84rem;text-decoration:underline;cursor:pointer;display:block';
  err.parentNode.insertBefore(b, err);
}
function tribuSumarOlvides(){
  tribuSumarOlvide('authInError', 'authInEmail');
  tribuSumarOlvide('inError', 'inEmail');
  tribuSumarOlvide('suLoginErr', 'suLoginEmail');
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tribuSumarOlvides);
else tribuSumarOlvides();

/* Botón de ojo para mostrar/ocultar contraseña: delegado en document, así
   funciona en cualquier .pw-wrap de cualquier página/modal sin wiring extra. */
document.addEventListener('click', e => {
  const btn = e.target.closest('.pw-toggle');
  if(!btn) return;
  const input = btn.previousElementSibling;
  if(!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.classList.toggle('is-visible', show);
  btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

/* Disciplinas / prácticas, agrupadas por área (filtro "Disciplina o práctica"
   de Red Tribu). Las etiquetas que carga cada perfil (profiles.categorias)
   salen de esta lista. Se conservan tal cual los nombres previos para que los
   perfiles ya cargados sigan coincidiendo. */
const DISCIPLINA_GRUPOS = {
  'Bienestar':            ['Reiki', 'Masajes', 'Terapias holísticas', 'Sanación', 'Sonoterapia'],
  'Movimiento':           ['Yoga', 'Biodanza', 'Ecstatic Dance', 'Danza'],
  'Artes':                ['Arte', 'Música', 'Compositor / Productor musical', 'Fotografía'],
  'Espiritualidad':       ['Meditación', 'Tarot / Oráculos', 'Astrología', 'Ceremonias', 'Respiración consciente', 'Breathwork'],
  'Deportes':             ['Karate', 'Entrenamiento funcional'],
  'Naturaleza':           ['Trekking', 'Permacultura'],
  'Desarrollo personal':  ['Coaching', 'Sesiones individuales', 'Facilitación'],
  'Producción y servicios': ['Organización de eventos', 'Eventos especiales', 'Talleres']
};
const CATEGORIAS_RED_TRIBU = Object.values(DISCIPLINA_GRUPOS).flat();
const TIPOS_CREADOR = ['Facilitador/a', 'Terapeuta', 'Guía / acompañante', 'Educador/a', 'Organizador/a', 'Productor/a', 'Artista', 'Prestador/a de servicios'];
const QUE_OFRECE = ['Sesión', 'Clase', 'Taller', 'Ceremonia', 'Consulta', 'Performance', 'Experiencia grupal', 'Formación'];
/* Color de cada categoría de la Red Tribu (etiquetas y bordes de fichas). */
const CATEGORIA_COLOR = { creador:'#D97A88', comunidad:'#F4C76B', experiencia:'#A99BC2', marca:'#63C2CA', lugar:'#A8CC74' };
const CATEGORIA_LABEL = { creador:'Creador/a', comunidad:'Comunidad', experiencia:'Experiencia', marca:'Marca', lugar:'Lugar' };

/* Categoría principal de un perfil (misma prioridad que las fichas de Red
   Tribu): un perfil puede tener varios roles, pero muestra uno solo. */
const ROL_CATEGORIA = { organiza_eventos:'creador', facilita_actividades:'creador', ofrece_servicios:'creador', quiere_colaborar:'creador', tiene_marca:'marca', tiene_lugar:'lugar', tiene_comunidad:'comunidad' };
function tribuCategoriaPerfil(p){
  if(!p) return 'creador';
  if(p.tipo === 'marca') return 'marca';
  const cats = (p.roles || []).map(r => ROL_CATEGORIA[r]).filter(Boolean);
  return ['creador', 'marca', 'lugar', 'comunidad'].find(c => cats.includes(c)) || 'creador';
}

/* Símbolo de cada categoría para cuando un perfil no subió foto. Todos en el
   mismo lenguaje: silueta plena, geométrica, dentro de un lienzo de 200x200.
   Un torso sirve para una persona, pero no para una marca ni para un lugar,
   así que cada categoría tiene el suyo:
     creador/a  → torso (la silueta de siempre)
     comunidad  → tres figuras juntas
     experiencia→ destello
     marca      → etiqueta
     lugar      → montañas
   Los de 'creador' están dibujados a mano en sus dos tamaños porque el torso
   recortado abajo no tolera escalarse; el resto son formas cerradas y
   centradas, así que el tamaño chico sale de escalarlas. */
const AVATAR_SIMBOLO = {
  creador: {
    full:  '<circle cx="100" cy="80" r="33"/><path d="M34 200c0-46 29.5-74 66-74s66 28 66 74z"/>',
    busto: '<circle cx="100" cy="58" r="25"/><path d="M50 138c0-27 22-46 50-46s50 19 50 46z"/>'
  },
  comunidad:
    '<circle cx="100" cy="74" r="25"/><path d="M60 148c0-23 18-38 40-38s40 15 40 38z"/>' +
    '<circle cx="44" cy="92" r="18"/><path d="M14 150c0-17 13-29 30-29 5 0 10 1 14 3-8 7-13 16-13 26z"/>' +
    '<circle cx="156" cy="92" r="18"/><path d="M186 150c0-17-13-29-30-29-5 0-10 1-14 3 8 7 13 16 13 26z"/>',
  experiencia:
    '<path d="M100 32c7 40 13 46 53 53-40 7-46 13-53 53-7-40-13-46-53-53 40-7 46-13 53-53z"/>' +
    '<path d="M160 118c3 17 6 20 23 23-17 3-20 6-23 23-3-17-6-20-23-23 17-3 20-6 23-23z"/>' +
    '<path d="M44 34c2 12 4 14 16 16-12 2-14 4-16 16-2-12-4-14-16-16 12-2 14-4 16-16z"/>',
  marca:
    '<path fill-rule="evenodd" d="M110 28h50a14 14 0 0 1 14 14v50a14 14 0 0 1-4.1 9.9l-62 62a14 14 0 0 1-19.8 0l-56-56a14 14 0 0 1 0-19.8l62-62A14 14 0 0 1 110 28zm36 26a13 13 0 1 0 0 26 13 13 0 0 0 0-26z"/>',
  lugar:
    '<circle cx="150" cy="58" r="15"/>' +
    '<path d="M18 158 76 62l44 72-20 24zM96 158l40-62 46 62z"/>'
};

/* Foto de perfil vacía: las ilustraciones de la marca (silueta neón sobre el
   fondo oscuro, teñida con el color de la categoría), en las tres proporciones
   que preparó diseño. Se usan mientras la persona todavía no subió su foto;
   la idea es que sean transitorias, no la imagen definitiva de un perfil.
     forma 'busto'  → cuadrada 1x1  (avatares, fichas chicas)
     forma 'ancho'  → 4x3           (banners y tarjetas horizontales)
     por defecto    → 4x5 vertical  (portadas y fichas verticales) */
const PLACEHOLDER_V = 1;
function tribuAvatarVacio(cat, forma){
  const categoria = CATEGORIA_COLOR[cat] ? cat : 'creador';
  const prop = forma === 'busto' ? '1x1' : forma === 'ancho' ? '4x3' : '4x5';
  return '/assets/placeholders/' + categoria + '_' + prop + '.png?v=' + PLACEHOLDER_V;
}

/* Versión dibujada del mismo símbolo, en SVG data: URI. Queda para donde no
   sirve un archivo (canvas de las placas, correos) o si hiciera falta un
   fondo liviano. */
const _avataresVacios = {};
function tribuAvatarSimbolo(cat, forma){
  const categoria = AVATAR_SIMBOLO[cat] && CATEGORIA_COLOR[cat] ? cat : 'creador';
  const busto = forma === 'busto';
  const k = categoria + (busto ? '-busto' : '');
  if(_avataresVacios[k]) return _avataresVacios[k];
  const c = CATEGORIA_COLOR[categoria];
  const simbolo = AVATAR_SIMBOLO[categoria];
  const figura = typeof simbolo === 'string'
    ? (busto ? '<g transform="translate(100 92) scale(.74) translate(-100 -100)">' + simbolo + '</g>' : simbolo)
    : simbolo[busto ? 'busto' : 'full'];
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
    '<defs><radialGradient id="g" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="' + c + '" stop-opacity=".34"/><stop offset="1" stop-color="' + c + '" stop-opacity=".07"/></radialGradient></defs>' +
    '<rect width="200" height="200" fill="#15171F"/><rect width="200" height="200" fill="url(#g)"/>' +
    '<g fill="' + c + '" fill-opacity=".92">' + figura + '</g></svg>';
  return (_avataresVacios[k] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
}

/* Listas del onboarding (pasos 2 y 3) — mismas opciones que el mockup. */
const INTERESES_TRIBU = ['Conectar', 'Bailar', 'Naturaleza', 'Música', 'Bienestar', 'Aprender', 'Conocer gente'];
const INTERES_EN_TRIBU = ['Experiencias', 'Talleres', 'Retiros', 'Productos', 'Lugares', 'Comunidad'];
const QUIERE_RECIBIR_TRIBU = ['Beneficios y descuentos', 'Planes para este finde', 'Novedades de la comunidad', 'Sorteos y experiencias especiales'];
const ROLES_PARTICIPACION = [
  { valor:'organiza_eventos', label:'Organizo eventos' },
  { valor:'facilita_actividades', label:'Facilito actividades' },
  { valor:'tiene_marca', label:'Tengo una marca' },
  { valor:'tiene_lugar', label:'Tengo un lugar' },
  { valor:'tiene_comunidad', label:'Tengo una comunidad' },
  { valor:'ofrece_servicios', label:'Ofrezco servicios' },
  { valor:'quiere_colaborar', label:'Quiero colaborar' }
];

/* A dónde mandar a alguien apenas se loguea/registra: si todavía no completó
   el onboarding (pasos 2 y 3), lo mandamos ahí; si ya lo completó, a su cuenta. */
async function tribuDestinoPostAuth(session){
  if(!session) return '/cuenta/';
  const { data } = await sb.from('profiles').select('onboarding_completo').eq('id', session.user.id).maybeSingle();
  if(!data || !data.onboarding_completo) return '/cuenta/onboarding/personalizar/';
  return '/cuenta/perfil/';
}

/* ¿Quien está logueado es del equipo de Tribu?

   Antes acá había una lista de mails copiada a mano, que también estaba
   repetida en cuatro políticas RLS y en la función es_equipo_tribu(). Sumar a
   alguien obligaba a tocar las seis, y olvidarse de una dejaba un agujero
   silencioso. Ahora hay una sola fuente de verdad: la tabla equipo_tribu en
   Supabase. Para sumar o sacar a alguien del equipo alcanza con una fila ahí,
   sin tocar código ni deployar.

   Esto sigue siendo solo para la PANTALLA (mostrar u ocultar el panel). La
   seguridad real son las políticas RLS y el chequeo que hace cada RPC de
   administración: aunque alguien fuerce esta función a devolver true, la base
   le sigue diciendo que no.

   Se cachea por carga de página: lo consultan varias pantallas y la respuesta
   no cambia en el medio. */
let _esEquipo = null;
async function tribuEsAdmin(){
  if(_esEquipo !== null) return _esEquipo;
  const { data, error } = await sb.rpc('es_equipo_tribu');
  return (_esEquipo = !error && data === true);
}

/* Actualiza los botones/links que dependen de si hay sesión iniciada
   (nav "Mi cuenta" vs "Ingresar", por ejemplo). Se llama en cada página. */
async function tribuSesionActual(){
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

async function tribuCerrarSesion(){
  await sb.auth.signOut();
  window.location.href = '/';
}

/* En cada página que requiera estar logueado, llamar a esto al cargar:
   si no hay sesión, redirige a /cuenta/ con el destino guardado. */
async function tribuRequiereSesion(){
  const session = await tribuSesionActual();
  if(!session){
    const volver = encodeURIComponent(location.pathname);
    window.location.href = '/cuenta/?volver=' + volver;
    return null;
  }
  return session;
}

/* Header: sin sesión, "Ingresar" + "Sumate". Con sesión, esos dos botones
   se reemplazan por una pastilla con la foto y el nombre de la persona y un
   menú (mi perfil / completar perfil / cerrar sesión). Se llama en cada página. */
async function tribuInitAuthNav(){
  const session = await tribuSesionActual();
  const hayModalLogin = !!document.getElementById('authModal');
  document.querySelectorAll('[data-auth-nav]').forEach(btn => {
    const label = btn.querySelector('[data-auth-label]') || btn;
    if(session){
      label.textContent = 'Mi cuenta';
      btn.setAttribute('href', '/cuenta/perfil/');
      btn.removeAttribute('data-auth');
    } else {
      label.textContent = 'Ingresar';
      // Sin el modal de login en la página, "Ingresar" abre el login del registro.
      btn.setAttribute('href', '#');
      if(hayModalLogin){ btn.setAttribute('data-auth', ''); }
      else { btn.removeAttribute('data-auth'); btn.setAttribute('data-signup-login', ''); }
    }
  });
  if(!session) return;

  const { data: p } = await sb.from('profiles').select('nombre, nombre_marca, tipo, roles, foto_url').eq('id', session.user.id).maybeSingle();
  const meta = session.user.user_metadata || {};
  const nombreCompleto = (p && (p.tipo === 'marca' ? (p.nombre_marca || p.nombre) : p.nombre)) || [meta.nombre, meta.apellido].filter(Boolean).join(' ') || session.user.email.split('@')[0];
  const primerNombre = nombreCompleto.split(' ')[0];
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let foto = p && p.foto_url;
  try{ const u = new URL(foto); if(u.protocol !== 'https:') foto = null; }catch(e){ foto = null; }
  const avatar = '<img src="' + esc(foto || tribuAvatarVacio(tribuCategoriaPerfil(p))) + '" alt="">';
  /* Se resuelve acá y no adentro del forEach: el callback no es async. */
  const esEquipo = await tribuEsAdmin();

  document.querySelectorAll('.nav .nav-cta').forEach(cta => {
    cta.querySelectorAll('[data-auth-nav], [data-signup]').forEach(el => el.style.display = 'none');
    if(cta.querySelector('.nav-me')) return;
    const me = document.createElement('div');
    me.className = 'nav-me';
    me.innerHTML =
      '<button type="button" class="nav-me-btn" aria-haspopup="menu" aria-expanded="false">' +
        '<span class="nav-me-av">' + avatar + '</span><span class="nav-me-name">' + esc(primerNombre) + '</span>' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="nav-me-menu" role="menu">' +
        '<a href="/cuenta/portal/">Mi portal (placas y materiales)</a>' +
        '<a href="/cuenta/perfil/">Mi perfil</a>' +
        '<a href="/cuenta/perfil/editar/">Completar / editar mi perfil</a>' +
        (esEquipo ? '<a href="/cuenta/admin-cambios/">Panel del equipo</a>' : '') +
        '<hr><a href="#" data-logout>Cerrar sesión</a>' +
      '</div>';
    const burger = cta.querySelector('.burger');
    cta.insertBefore(me, burger || null);
    const btn = me.querySelector('.nav-me-btn');
    btn.addEventListener('click', e => { e.stopPropagation(); const o = me.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
    document.addEventListener('click', e => { if(!me.contains(e.target)) me.classList.remove('open'); });
  });
  document.querySelectorAll('.mobile-menu').forEach(mm => {
    mm.querySelectorAll('[data-signup]').forEach(el => {
      el.textContent = 'Completar mi perfil';
      el.setAttribute('href', '/cuenta/perfil/editar/');
      el.removeAttribute('data-signup');
    });
  });
}
document.addEventListener('click', e => {
  if(e.target.closest('[data-logout]')){ e.preventDefault(); tribuCerrarSesion(); }
});
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', tribuInitAuthNav);
} else {
  tribuInitAuthNav();
}

/* Modal de login/registro embebido en el nav (mismo patrón que los demás
   modales del sitio: overlay .open + disparadores [data-auth] delegados). */
(function(){
  const overlay = document.getElementById('authModal');
  if(!overlay) return;
  const tabs = overlay.querySelectorAll('#authTabs .tab-btn');
  const panelCrear = document.getElementById('authPanelCrear');
  const panelIngresar = document.getElementById('authPanelIngresar');

  function mostrarTab(tab){
    tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
    panelCrear.style.display = tab === 'crear' ? '' : 'none';
    panelIngresar.style.display = tab === 'ingresar' ? '' : 'none';
  }
  tabs.forEach(t => t.addEventListener('click', () => mostrarTab(t.dataset.tab)));

  const open = () => { overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; };
  const close = () => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); document.body.style.overflow=''; };
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-auth]');
    if(!trigger) return;
    e.preventDefault();
    mostrarTab('ingresar');
    open();
  });
  document.getElementById('authClose').addEventListener('click', close);
  overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && overlay.classList.contains('open')) close(); });

  document.getElementById('authFormCrear').addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('authCrError'); err.style.display = 'none';
    const btn = document.getElementById('authCrBtn'); btn.textContent = 'Creando...'; btn.disabled = true;
    const email = document.getElementById('authCrEmail').value.trim();
    const password = document.getElementById('authCrPass').value;
    const { data, error } = await sb.auth.signUp({ email, password });
    btn.textContent = 'Crear cuenta'; btn.disabled = false;
    if(error){ err.textContent = error.message; err.style.display = 'block'; return; }
    if(tribuEsRegistroRepetido(data)){
      err.textContent = TRIBU_MSG_REPETIDO; err.style.display = 'block';
      const inEmail = document.getElementById('authInEmail'); if(inEmail) inEmail.value = email;
      return;
    }
    if(data.session){
      window.location.href = await tribuDestinoPostAuth(data.session);
    } else {
      document.getElementById('authFormCrear').style.display = 'none';
      document.getElementById('authCrMsg').style.display = 'block';
    }
  });

  document.getElementById('authFormIngresar').addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('authInError'); err.style.display = 'none';
    const btn = document.getElementById('authInBtn'); btn.textContent = 'Ingresando...'; btn.disabled = true;
    const email = document.getElementById('authInEmail').value.trim();
    const password = document.getElementById('authInPass').value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    btn.textContent = 'Ingresar'; btn.disabled = false;
    if(error){ err.textContent = 'Email o contraseña incorrectos.'; err.style.display = 'block'; return; }
    window.location.href = await tribuDestinoPostAuth(data.session);
  });
})();

/* Modal "Crear perfil de Creador/a / de marca" (ronda 3): inscripción al
   Programa para Creadores o al de Marcas aliadas, en organizas-experiencias y
   representas-marca. Se dispara con [data-solicitud="creador"|"marca"].
   - Los datos van a solicitudes_comunidad (Supabase), como siempre.
   - La foto viaja al Apps Script, que la guarda en Drive junto con la fila:
     quien completa esto puede no tener cuenta, y el storage de Supabase sólo
     acepta fotos de usuarios con sesión.
   - Al final, el link de pago de Mercado Pago de la suscripción. */
const TRIBU_PAGO_SUSCRIPCION = {
  /* 🔧 EDITABLE: link de suscripción de Mercado Pago de cada programa. Vacío =
     se avisa que el link llega por WhatsApp. */
  creador: '',
  marca: ''
};
(function(){
  const overlay = document.getElementById('solicitudModal');
  if(!overlay) return;
  const $ = id => document.getElementById(id);
  const form = $('solicitudForm');
  const catBox = $('solCategorias');
  const categoriasSel = [];
  let fotoDataUrl = '';

  /* Las categorías son las mismas prácticas que usa el filtro de la Red
     Tribu (si el catálogo está cargado); si no, el listado corto de siempre. */
  const catalogo = typeof DISCIPLINA_GRUPOS_CATALOGO !== 'undefined'
    ? Object.values(DISCIPLINA_GRUPOS_CATALOGO).flat()
    : (typeof CATEGORIAS_RED_TRIBU !== 'undefined' ? CATEGORIAS_RED_TRIBU : []);
  catalogo.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'cat-chip'; chip.textContent = cat;
    chip.addEventListener('click', () => {
      const i = categoriasSel.indexOf(cat);
      if(i > -1){ categoriasSel.splice(i, 1); chip.classList.remove('sel'); }
      else { categoriasSel.push(cat); chip.classList.add('sel'); }
    });
    catBox.appendChild(chip);
  });
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  $('solCatBuscar').addEventListener('input', e => {
    const q = norm(e.target.value.trim());
    catBox.querySelectorAll('.cat-chip').forEach(c => c.style.display = !q || norm(c.textContent).includes(q) || c.classList.contains('sel') ? '' : 'none');
  });

  $('solBio').addEventListener('input', e => { $('solBioCount').textContent = e.target.value.length; });

  /* La foto se achica en el navegador (máx. 1200 px, JPEG) antes de mandarla:
     una foto de celular pesa varios MB y el Apps Script tiene límite. */
  $('solFoto').addEventListener('change', async e => {
    const f = e.target.files[0];
    fotoDataUrl = '';
    if(!f) return;
    if(!/^image\//.test(f.type)){ $('solFotoTxt').textContent = 'Ese archivo no es una imagen.'; return; }
    try{
      const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = URL.createObjectURL(f); });
      const k = Math.min(1, 1200 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      fotoDataUrl = c.toDataURL('image/jpeg', 0.85);
      $('solFotoPrev').src = fotoDataUrl; $('solFotoPrev').hidden = false;
      $('solFotoTxt').textContent = f.name + ' · tocá para cambiarla';
    }catch(ex){ $('solFotoTxt').textContent = 'No pudimos leer esa imagen. Probá con otra.'; }
  });

  const open = (tipo) => {
    const marca = tipo === 'marca';
    $('solTipo').value = tipo;
    $('solCampoMarca').style.display = marca ? '' : 'none';
    $('solicitudTitle').textContent = marca ? 'Crear perfil de marca' : 'Crear perfil de Creador/a';
    $('solicitudSub').textContent = marca ? 'Completá tus datos para sumarte al Programa de Marcas aliadas Tribu.' : 'Completá tus datos para sumarte al Programa para Creadores.';
    $('solFotoLabel').textContent = marca ? 'Foto para tu perfil de marca' : 'Foto para tu perfil de Creador/a';
    $('solNombreMarca').required = marca;
    form.style.display = ''; $('solMsg').style.display = 'none';
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  };
  const close = () => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-solicitud]');
    if(!trigger) return;
    e.preventDefault();
    open(trigger.dataset.solicitud);
  });
  $('solicitudClose').addEventListener('click', close);
  overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && overlay.classList.contains('open')) close(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('solError'); err.style.display = 'none';
    const fallo = t => { err.textContent = t; err.style.display = 'block'; };
    const tipo = $('solTipo').value;
    const v = id => $(id).value.trim();
    if(!v('solNombre')) return fallo('Completá tu nombre y apellido.');
    if(!v('solTelefono')) return fallo('Dejanos un teléfono para escribirte.');
    if(!/^\S+@\S+\.\S+$/.test(v('solEmail'))) return fallo('Revisá el mail.');
    if(tipo === 'marca' && !v('solNombreMarca')) return fallo('Contanos cómo se llama la marca.');
    if(!fotoDataUrl) return fallo('Sumá una foto para tu perfil.');
    if(!categoriasSel.length) return fallo('Elegí al menos una opción de lo que ofrecés.');
    const btn = $('solBtn'); btn.textContent = 'Enviando...'; btn.disabled = true;
    try{
      const row = {
        tipo, nombre: v('solNombre'), nombre_marca: v('solNombreMarca') || null,
        telefono: v('solTelefono'), email: v('solEmail'),
        instagram: v('solInstagram') || null, sitio_web: v('solWeb') || null,
        mini_bio: v('solBio') || null, categorias: categoriasSel.slice()
      };
      const { error } = await sb.from('solicitudes_comunidad').insert(row);
      if(error) throw error;
      /* Copia a la planilla con la foto: si falla, la solicitud igual quedó
         guardada y la foto se pide después. */
      if(typeof enviarASheets === 'function'){
        const fd = new FormData();
        fd.set('Programa', tipo === 'marca' ? 'Marcas aliadas' : 'Creadores');
        fd.set('Nombre', row.nombre); fd.set('Marca', row.nombre_marca || '');
        fd.set('Telefono', row.telefono); fd.set('Email', row.email);
        fd.set('RRSS', row.instagram || ''); fd.set('Web', row.sitio_web || '');
        fd.set('MiniBio', row.mini_bio || ''); fd.set('Ofrece', row.categorias.join(', '));
        fd.set('Foto', fotoDataUrl);
        enviarASheets(fd, 'SolicitudPrograma').catch(() => {});
      }
      form.style.display = 'none';
      const link = TRIBU_PAGO_SUSCRIPCION[tipo];
      $('solMsgTxt').textContent = link
        ? 'Último paso: activá tu suscripción con Mercado Pago. Apenas se acredite, publicamos tu perfil.'
        : 'Te enviamos por WhatsApp el link de pago de Mercado Pago para activar tu suscripción. Apenas se acredite, publicamos tu perfil.';
      $('solPagar').hidden = !link; if(link) $('solPagar').href = link;
      $('solMsg').style.display = 'block';
    }catch(ex){
      fallo('No se pudo enviar. Probá de nuevo en un momento.');
    }finally{
      btn.textContent = 'Crear mi perfil'; btn.disabled = false;
    }
  });
})();

/* Formulario "Quiero cotizar un servicio especial / un Plan de Comunicación
   Continua" (ronda 3). Un solo modal para las dos landings: los campos
   cambian según [data-cotizar="creador"|"marca"], como pide el documento. Va a
   la planilla (pestaña "Cotizaciones") y avisa por mail al equipo. */
(function(){
  let overlay = null, tipo = 'creador', que = '';
  const CAMPOS = {
    creador: [
      ['Nombre', 'Nombre y apellido', 'input', true],
      ['WhatsApp', 'WhatsApp', 'input', true],
      ['Email', 'Mail', 'email', true],
      ['Instagram', 'Instagram', 'input'],
      ['Web', 'Web', 'input'],
      ['Ofrece', '¿Qué ofrecés? Contanos brevemente sobre tu propuesta.', 'textarea', true],
      ['Donde', 'Si es un evento por favor contanos en donde es.', 'input'],
      ['Busca', '¿Qué estás buscando?', 'textarea']
    ],
    marca: [
      ['Nombre', 'Nombre y apellido', 'input', true],
      ['WhatsApp', 'Teléfono', 'input', true],
      ['Email', 'Mail', 'email', true],
      ['Instagram', 'Instagram', 'input'],
      ['Web', 'Web', 'input'],
      ['Ofrece', '¿Qué ofrecés? Contanos brevemente sobre tu propuesta', 'textarea', true],
      ['Busca', '¿Qué servicio te interesa?', 'textarea']
    ]
  };
  function armar(){
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay'; overlay.id = 'cotizarModal'; overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="cotTitulo">' +
        '<button class="modal-close" type="button" data-cot-cerrar aria-label="Cerrar">✕</button>' +
        '<h2 id="cotTitulo"></h2><p class="modal-sub" id="cotSub"></p>' +
        '<form id="cotForm" novalidate><div id="cotCampos"></div>' +
          '<p class="field-error" id="cotError" style="display:none"></p>' +
          '<button type="submit" class="btn btn--spectrum" id="cotBtn" style="width:100%;justify-content:center">Enviar</button>' +
        '</form>' +
        '<div class="cot-ok" id="cotOk" hidden><b>¡Gracias!</b><p>Nos pondremos en contacto a la brevedad.</p></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if(e.target === overlay || e.target.closest('[data-cot-cerrar]')) cerrar(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && overlay.classList.contains('open')) cerrar(); });
    overlay.querySelector('#cotForm').addEventListener('submit', enviar);
  }
  function abrir(t, q){
    if(!overlay) armar();
    tipo = t === 'marca' ? 'marca' : 'creador'; que = q || 'Servicio especial';
    /* 'Primera conversación': el cierre de las landings (antes iba a un WhatsApp
       personal; la reunión del 13/10 pidió canalizar las consultas por formulario). */
    const charla = que === 'Primera conversación';
    overlay.querySelector('#cotTitulo').textContent = charla ? (tipo === 'marca' ? 'Hablemos de tu marca' : 'Hablemos de tu proyecto')
      : 'Quiero cotizar ' + (que === 'Plan de Comunicación Continua' ? 'un Plan de Comunicación Continua' : 'un servicio especial');
    overlay.querySelector('#cotSub').textContent = charla ? 'Contanos lo que estás creando y te escribimos para coordinar una primera conversación, sin compromiso.'
      : 'Contanos sobre tu propuesta y te respondemos con opciones y valores.';
    overlay.querySelector('#cotCampos').innerHTML = CAMPOS[tipo].map(([k, etq, ctl, req]) =>
      '<div class="field"><label for="cot' + k + '">' + etq + '</label>' +
      (ctl === 'textarea'
        ? '<textarea id="cot' + k + '" maxlength="800"' + (req ? ' required' : '') + '></textarea>'
        : '<input id="cot' + k + '" type="' + (ctl === 'email' ? 'email' : 'text') + '"' + (req ? ' required' : '') + '>') +
      '</div>').join('');
    overlay.querySelector('#cotForm').hidden = false;
    overlay.querySelector('#cotOk').hidden = true;
    overlay.querySelector('#cotError').style.display = 'none';
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    setTimeout(() => { const f = overlay.querySelector('#cotNombre'); if(f) f.focus(); }, 60);
  }
  function cerrar(){ overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  async function enviar(e){
    e.preventDefault();
    const err = overlay.querySelector('#cotError'); err.style.display = 'none';
    const val = k => (overlay.querySelector('#cot' + k) || {}).value?.trim() || '';
    const falta = CAMPOS[tipo].find(([k, , , req]) => req && !val(k));
    if(falta){ err.textContent = 'Completá: ' + falta[1].replace(/[.?¿]/g, '').trim() + '.'; err.style.display = 'block'; return; }
    if(!/^\S+@\S+\.\S+$/.test(val('Email'))){ err.textContent = 'Revisá el mail.'; err.style.display = 'block'; return; }
    const btn = overlay.querySelector('#cotBtn'); btn.disabled = true; btn.textContent = 'Enviando…';
    const fd = new FormData();
    fd.set('Perfil', tipo === 'marca' ? 'Marca' : 'Creador/a');
    fd.set('Cotiza', que);
    ['Nombre', 'WhatsApp', 'Email', 'Instagram', 'Web', 'Ofrece', 'Donde', 'Busca'].forEach(k => fd.set(k, val(k)));
    try{
      await enviarASheets(fd, 'Cotizacion');
      overlay.querySelector('#cotForm').hidden = true;
      overlay.querySelector('#cotOk').hidden = false;
    }catch(ex){
      /* Mismo respaldo que el resto de los formularios: mail prellenado. */
      const cuerpo = CAMPOS[tipo].map(([k, etq]) => etq + ' ' + val(k)).join('\n');
      location.href = 'mailto:contacto@tribuconnection.com?subject=' + encodeURIComponent('Cotización: ' + que) + '&body=' + encodeURIComponent(cuerpo);
    }finally{ btn.disabled = false; btn.textContent = 'Enviar'; }
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-cotizar]');
    if(!t) return;
    e.preventDefault();
    abrir(t.dataset.cotizar, t.dataset.cotizarQue);
  });
})();

/* ============ REGISTRO "SUMATE" (paso 1 de 3) ============
   Lo abre cualquier [data-signup] de cualquier página (el "Sumate" del
   header). Con sesión iniciada lleva a completar el perfil en vez de
   registrar de nuevo. Pasos 2 y 3: /cuenta/onboarding/personalizar/ y
   /cuenta/onboarding/participacion/. El modal se arma acá por JS para no
   duplicar el HTML en cada página. */
(function(){
  const I = {
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
    lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/></svg>',
    eye:'<svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    shield:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    google:'<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
    sparkle:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 3.2 1.4 5.3 2.8 6.7C16.2 10.1 18 11 21 11.5c-3 .5-4.8 1.4-6.2 2.8C13.4 15.7 12.6 17.8 12 21c-.6-3.2-1.4-5.3-2.8-6.7C7.8 12.9 6 12 3 11.5c3-.5 4.8-1.4 6.2-2.8C10.6 7.3 11.4 5.2 12 2z"/></svg>'
  };
  function pw(id, ph, ac){
    return '<div class="su-in pw-wrap">' + I.lock + '<input id="' + id + '" type="password" placeholder="' + ph + '" autocomplete="' + ac + '" minlength="6"><button type="button" class="pw-toggle" aria-label="Mostrar contraseña" tabindex="-1">' + I.eye + '</button></div>';
  }
  const google = '<div class="su-gwrap" hidden><div class="su-or">o continuar con Google</div><button type="button" class="su-google" data-su-google>' + I.google + 'Continuar con Google</button></div>';

  let overlay = null;

  function armar(){
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay su-overlay';
    overlay.id = 'signupModal';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="suTitle">' +
        '<button class="modal-close su-close" type="button" aria-label="Cerrar">✕</button>' +
        '<div class="su-grid">' +
          '<div>' +
            '<form id="suForm" novalidate>' +
              '<div class="su-steps"><b>Paso 1 de 3</b><div class="su-dots"><i class="on"></i><s class="on"></s><i></i><s></s><i></i></div></div>' +
              '<h2 class="su-title" id="suTitle">Ser parte de la Tribu</h2>' +
              '<p class="su-sub">Creá tu cuenta para empezar a descubrir beneficios, experiencias y recomendaciones pensadas para vos.</p>' +
              '<div class="su-row">' +
                '<div class="su-in">' + I.user + '<input id="suNombre" placeholder="Nombre" autocomplete="given-name"></div>' +
                '<div class="su-in">' + I.user + '<input id="suApellido" placeholder="Apellido" autocomplete="family-name"></div>' +
              '</div>' +
              '<div class="su-in">' + I.mail + '<input id="suEmail" type="email" placeholder="Correo electrónico" autocomplete="email"></div>' +
              pw('suPass', 'Contraseña', 'new-password') +
              pw('suPass2', 'Confirmar contraseña', 'new-password') +
              '<label class="su-check"><input type="checkbox" id="suTerms"><span>Acepto los <a href="#" data-legal="terminos">términos</a> y la <a href="#" data-legal="privacidad">política de privacidad</a>.</span></label>' +
              '<p class="su-err" id="suErr"></p>' +
              '<button type="submit" class="btn btn--spectrum su-btn" id="suBtn"><span>Continuar</span> <span class="arr">→</span></button>' +
              '<button type="button" class="btn btn--ghost su-alt" data-su-modo="login">Ya tengo cuenta</button>' +
              google +
              '<p class="su-note">' + I.shield + 'Después vas a poder completar tus intereses y preferencias.</p>' +
            '</form>' +
            '<form id="suLogin" novalidate hidden>' +
              '<h2 class="su-title">Ingresar</h2>' +
              '<p class="su-sub">Entrá con tu cuenta para editar tu perfil, publicar experiencias y acceder a tus beneficios.</p>' +
              '<div class="su-in">' + I.mail + '<input id="suLoginEmail" type="email" placeholder="Correo electrónico" autocomplete="email"></div>' +
              pw('suLoginPass', 'Contraseña', 'current-password') +
              '<button type="button" class="olvide-link" data-olvide="#suLoginEmail" data-olvide-msg="#suLoginErr" style="background:none;border:0;padding:0;margin:.1rem 0 .6rem;color:var(--soft);font:inherit;font-size:.84rem;text-decoration:underline;cursor:pointer;align-self:flex-start">¿Olvidaste tu contraseña?</button>' +
              '<p class="su-err" id="suLoginErr"></p>' +
              '<button type="submit" class="btn btn--spectrum su-btn" id="suLoginBtn"><span>Ingresar</span> <span class="arr">→</span></button>' +
              '<button type="button" class="btn btn--ghost su-alt" data-su-modo="registro">Crear una cuenta nueva</button>' +
              google +
            '</form>' +
            '<div class="su-done" id="suDone" hidden>' +
              '<div class="ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg></div>' +
              '<h2 class="su-title">Revisá tu correo</h2>' +
              '<p class="su-sub" id="suDoneTxt"></p>' +
              '<p class="su-note">' + I.shield + 'Al confirmar seguís con el paso 2: tus intereses y preferencias.</p>' +
            '</div>' +
          '</div>' +
          '<aside class="su-side" aria-hidden="true">' +
            '<svg class="su-curve" viewBox="0 0 300 130" preserveAspectRatio="none"><defs><linearGradient id="suCurveG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#F47A2A"/><stop offset=".55" stop-color="#E0336E"/><stop offset="1" stop-color="#E0336E" stop-opacity="0"/></linearGradient></defs><path d="M3 128 C3 48 30 16 110 12 L298 6" fill="none" stroke="url(#suCurveG)" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>' +
            '<div class="su-card">' +
            '<div class="su-avatar"><div>' + I.user.replace('stroke-width="1.8"', 'stroke-width="1.3"') + '</div><span>' + I.sparkle + '</span></div>' +
            '<div class="su-ben"><svg viewBox="0 0 24 24" fill="none" stroke="#F47A2A" stroke-width="1.7"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><path d="M8 7.5v3M6.5 9h3"/></svg><span>Accedé a beneficios y descuentos exclusivos.</span></div>' +
            '<div class="su-ben"><svg viewBox="0 0 24 24" fill="none" stroke="#E0336E" stroke-width="1.7"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg><span>Recibí planes, novedades y recomendaciones.</span></div>' +
            '<div class="su-ben"><svg viewBox="0 0 24 24" fill="none" stroke="#4F7BEA" stroke-width="1.7"><circle cx="12" cy="7.5" r="3"/><circle cx="5.5" cy="10" r="2.3"/><circle cx="18.5" cy="10" r="2.3"/><path d="M7 20a5 5 0 0 1 10 0M1.5 19.5a4 4 0 0 1 5-3.8M22.5 19.5a4 4 0 0 0-5-3.8"/></svg><span>Descubrí experiencias y personas afines a vos.</span></div>' +
          '</div></aside>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    const $ = sel => overlay.querySelector(sel);
    $('.su-close').addEventListener('click', cerrar);
    overlay.addEventListener('click', e => { if(e.target === overlay) cerrar(); });
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && overlay.classList.contains('open') && !document.querySelector('#legalModal.open')) cerrar();
    });
    overlay.querySelectorAll('[data-su-modo]').forEach(b => b.addEventListener('click', () => modo(b.dataset.suModo)));
    overlay.querySelectorAll('[data-su-google]').forEach(b => b.addEventListener('click', () => {
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/cuenta/' } });
    }));

    $('#suForm').addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#suErr'); err.style.display = 'none';
      const v = id => $('#' + id).value.trim();
      const fallo = t => { err.textContent = t; err.style.display = 'block'; };
      if(!v('suNombre') || !v('suApellido')) return fallo('Completá tu nombre y apellido.');
      if(!/^\S+@\S+\.\S+$/.test(v('suEmail'))) return fallo('Revisá el correo electrónico.');
      const pass = $('#suPass').value;
      if(pass.length < 6) return fallo('La contraseña tiene que tener al menos 6 caracteres.');
      if(pass !== $('#suPass2').value) return fallo('Las contraseñas no coinciden.');
      if(!$('#suTerms').checked) return fallo('Para continuar, aceptá los términos y la política de privacidad.');
      const btn = $('#suBtn'), lbl = btn.querySelector('span');
      btn.disabled = true; lbl.textContent = 'Creando cuenta...';
      const { data, error } = await sb.auth.signUp({
        email: v('suEmail'), password: pass,
        options: { data: { nombre: v('suNombre'), apellido: v('suApellido') } }
      });
      btn.disabled = false; lbl.textContent = 'Continuar';
      if(error) return fallo(/registered|already/i.test(error.message) ? 'Ya existe una cuenta con ese correo. Probá con "Ya tengo cuenta".' : error.message);
      if(tribuEsRegistroRepetido(data)){
        /* Pasa directo a "Ingresar" con el correo ya escrito y el aviso. */
        modo('login');
        $('#suLoginEmail').value = v('suEmail');
        const le = $('#suLoginErr'); le.textContent = TRIBU_MSG_REPETIDO; le.style.display = 'block';
        return;
      }
      if(data.session){ window.location.href = await tribuDestinoPostAuth(data.session); return; }
      $('#suDoneTxt').textContent = 'Te mandamos un mail a ' + v('suEmail') + ' para confirmar tu cuenta. Abrilo y tocá el link para seguir.';
      modo('listo');
    });

    $('#suLogin').addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#suLoginErr'); err.style.display = 'none';
      const btn = $('#suLoginBtn'), lbl = btn.querySelector('span');
      btn.disabled = true; lbl.textContent = 'Ingresando...';
      const { data, error } = await sb.auth.signInWithPassword({ email: $('#suLoginEmail').value.trim(), password: $('#suLoginPass').value });
      btn.disabled = false; lbl.textContent = 'Ingresar';
      if(error){
        err.textContent = /confirm/i.test(error.message) ? 'Todavía no confirmaste tu correo: revisá tu bandeja de entrada.' : 'Email o contraseña incorrectos.';
        err.style.display = 'block'; return;
      }
      window.location.href = await tribuDestinoPostAuth(data.session);
    });

    /* El botón de Google aparece solo si el proveedor está activo en Supabase. */
    fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_KEY } })
      .then(r => r.json())
      .then(s => { const on = !!(s.external && s.external.google); overlay.querySelectorAll('.su-gwrap').forEach(g => g.hidden = !on); })
      .catch(() => {});
  }

  function modo(m){
    overlay.querySelector('#suForm').hidden = m !== 'registro';
    overlay.querySelector('#suLogin').hidden = m !== 'login';
    overlay.querySelector('#suDone').hidden = m !== 'listo';
    const f = m === 'registro' ? '#suNombre' : m === 'login' ? '#suLoginEmail' : null;
    if(f) setTimeout(() => overlay.querySelector(f).focus(), 60);
  }
  function abrir(m){
    if(!overlay) armar();
    modo(m);
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function cerrar(){
    overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
  }

  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-signup], [data-signup-login]');
    if(!t) return;
    e.preventDefault();
    if(t.hasAttribute('data-signup')){
      const session = await tribuSesionActual();
      if(session){ window.location.href = '/cuenta/perfil/editar/'; return; }
      abrir('registro');
    } else {
      abrir('login');
    }
  });
})();

/* ============ ONBOARDING: piezas compartidas de los pasos 2 y 3 ============ */
const TRIBU_ROL_ESTILO = {
  facilita_actividades: { c:'#B07CF0', svg:'<circle cx="12" cy="5" r="2.2"/><path d="M5 9.5 12 11l7-1.5M12 11v4.5M8.5 21l3.5-5.5 3.5 5.5"/>' },
  organiza_eventos:     { c:'#F47A2A', svg:'<path d="M12 3c1 2.5 3 3.5 5.5 3.5-1.5 2-1.5 4 0 6-2.5 0-4.5 1-5.5 3.5-1-2.5-3-3.5-5.5-3.5 1.5-2 1.5-4 0-6C9 6.5 11 5.5 12 3z"/><path d="M12 16v5"/>' },
  tiene_marca:          { c:'#9BCB46', svg:'<rect x="3.5" y="7" width="17" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3.5 12h17M12 10.5v3"/>' },
  tiene_lugar:          { c:'#4F7BEA', svg:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>' },
  tiene_comunidad:      { c:'#36B7C4', svg:'<circle cx="12" cy="8" r="3"/><circle cx="5" cy="10.5" r="2.2"/><circle cx="19" cy="10.5" r="2.2"/><path d="M7 20a5 5 0 0 1 10 0M1.5 19.5a3.8 3.8 0 0 1 5-3.5M22.5 19.5a3.8 3.8 0 0 0-5-3.5"/>' },
  ofrece_servicios:     { c:'#F4A623', svg:'<path d="M12 2c.6 3.2 1.4 5.3 2.8 6.7C16.2 10.1 18 11 21 11.5c-3 .5-4.8 1.4-6.2 2.8C13.4 15.7 12.6 17.8 12 21c-.6-3.2-1.4-5.3-2.8-6.7C7.8 12.9 6 12 3 11.5c3-.5 4.8-1.4 6.2-2.8C10.6 7.3 11.4 5.2 12 2z"/>' },
  quiere_colaborar:     { c:'#E0336E', svg:'<path d="M20.8 4.6a5 5 0 0 0-7.1 0L12 5.3l-1.7-.7a5 5 0 0 0-7.1 7.1L12 20.3l8.8-8.6a5 5 0 0 0 0-7.1z"/>' }
};

/* Panel derecho "Tu perfil": avatar + resumen de lo elegido. `d` trae
   ciudad / intereses / interes_en / quiere_recibir; lo vacío se muestra
   como "Todavía no elegiste". */
function tribuPanelPerfil(el, d, titulo){
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lista = a => (a && a.length) ? '<span>' + esc(a.join(', ')) + '</span>' : '<span class="vacio">Todavía no elegiste</span>';
  const fila = (color, svg, label, valor) =>
    '<div class="onb-sum"><svg viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.7">' + svg + '</svg><div><b>' + label + '</b>' + valor + '</div></div>';
  el.innerHTML =
    '<svg class="su-curve" viewBox="0 0 300 130" preserveAspectRatio="none"><defs><linearGradient id="onbCurveG" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#F47A2A"/><stop offset=".55" stop-color="#E0336E"/><stop offset="1" stop-color="#E0336E" stop-opacity="0"/></linearGradient></defs><path d="M3 128 C3 48 30 16 110 12 L298 6" fill="none" stroke="url(#onbCurveG)" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>' +
    '<div class="su-card">' +
      '<div class="su-avatar"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></div><span><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 3.2 1.4 5.3 2.8 6.7C16.2 10.1 18 11 21 11.5c-3 .5-4.8 1.4-6.2 2.8C13.4 15.7 12.6 17.8 12 21c-.6-3.2-1.4-5.3-2.8-6.7C7.8 12.9 6 12 3 11.5c3-.5 4.8-1.4 6.2-2.8C10.6 7.3 11.4 5.2 12 2z"/></svg></span></div>' +
      '<div class="onb-side-title">' + esc(titulo) + '</div>' +
      fila('#F47A2A', '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', 'Ubicación', d.ciudad ? '<span>' + esc(d.ciudad) + '</span>' : '<span class="vacio">Cerca tuyo</span>') +
      fila('#E0336E', '<path d="M20.8 4.6a5 5 0 0 0-7.1 0L12 5.3l-1.7-.7a5 5 0 0 0-7.1 7.1L12 20.3l8.8-8.6a5 5 0 0 0 0-7.1z"/>', 'Intereses', lista(d.intereses)) +
      fila('#E0336E', '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>', 'Te interesa', lista(d.interes_en)) +
      fila('#E0336E', '<rect x="3.5" y="9" width="17" height="11.5" rx="2"/><path d="M3.5 13h17M12 9v11.5M12 9c-1.5-4-6-4-6-1.5S12 9 12 9zm0 0c1.5-4 6-4 6-1.5S12 9 12 9z"/>', 'Vas a recibir', lista(d.quiere_recibir)) +
      '<div class="onb-side-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg><span>Más adelante también podés sumar proyectos, comunidades o roles profesionales.</span></div>' +
    '</div>';
}
