/* Cliente compartido de Supabase para toda la web.
   La "publishable key" es segura para exponer en el navegador (está pensada
   para eso, como una API key pública) — el control de acceso real vive en las
   políticas de Row Level Security de cada tabla, no en ocultar esta clave. */
const SUPABASE_URL = 'https://dcoazdjqdohiekcsaxor.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zC1SJUG-5kHTWArEgYIqBw_tuYEqwOf';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIAS_RED_TRIBU = [
  'Yoga', 'Música', 'Meditación', 'Biodanza', 'Respiración consciente',
  'Sesiones individuales', 'Tarot / Oráculos', 'Terapias holísticas',
  'Compositor / Productor musical', 'Facilitación', 'Talleres',
  'Eventos especiales', 'Organización de eventos', 'Arte', 'Coaching', 'Sanación'
];

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

/* Mismo mail-a-mail que las políticas RLS de event_submissions en Supabase:
   si se suma o saca a alguien acá, hay que tocar también esas políticas
   (son la seguridad real; esta lista solo decide qué se MUESTRA en pantalla). */
const ADMIN_EMAILS = [
  'deco.latini@gmail.com', 'auc.spanish@gmail.com', 'anto.gas.camuzzi@gmail.com', 'carlamlandolfi@gmail.com',
  'andres@tribuconnection.com', 'rodrigo@tribuconnection.com', 'carla@tribuconnection.com',
  'contacto@tribuconnection.com', 'hola@tribuconnection.com', 'antonella@tribuconnection.com', 'rodri.epb@gmail.com'
];
function tribuEsAdmin(session){
  return !!(session && session.user && ADMIN_EMAILS.includes(session.user.email));
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

/* Botón de nav [data-auth-nav]: "Ingresar" (abre el modal) si no hay sesión,
   "Mi cuenta" (va al perfil) si ya está logueado. Se llama en cada página. */
async function tribuInitAuthNav(){
  const session = await tribuSesionActual();
  document.querySelectorAll('[data-auth-nav]').forEach(btn => {
    const label = btn.querySelector('[data-auth-label]') || btn;
    if(session){
      label.textContent = 'Mi cuenta';
      btn.setAttribute('href', '/cuenta/perfil/');
      btn.removeAttribute('data-auth');
    } else {
      label.textContent = 'Ingresar';
      btn.setAttribute('href', '#');
      btn.setAttribute('data-auth', '');
    }
  });
}
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
