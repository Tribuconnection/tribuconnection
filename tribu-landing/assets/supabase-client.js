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
