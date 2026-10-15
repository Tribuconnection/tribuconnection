/* Google Sheets: URL del Web App de Apps Script (ver google-apps-script/INSTRUCCIONES.txt) */
const SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwyaT9_K7Y2RXFbr8X_9vPGwRfrbmncEOV1Gcsa907VSx4bMcjxiIqHwx4DbJahMVRS/exec';

/* Envia el formulario a la planilla. Lanza excepcion si no se pudo guardar,
   para que quien llama muestre el respaldo por mail en vez de un falso "Recibido". */
async function enviarASheets(fd, tipo){
  fd.set('Tipo', tipo);
  const res = await fetch(SHEETS_ENDPOINT, { method:'POST', body: fd });
  const data = await res.json();
  if(!data.ok) throw new Error(data.error || 'No se pudo guardar');
}

/* Capa de mapa compartida: Esri "World Street Map" (gratis, sin API key), con
   la estética clásica tipo Google Maps (calles claras, rutas resaltadas,
   etiquetas) en vez del canvas oscuro que se usaba antes. CARTO dejó de
   servir sus tiles gratis sin key en 2026, por eso se usa Esri — no pide key
   y llega a zoom 19, de sobra para lo que usamos acá (barrio/ciudad, nunca
   calle a calle). */
/* ============ LEAFLET A DEMANDA ============
   Antes Leaflet venía en el <body> de cada página con mapa: dos pedidos a
   unpkg bloqueando el parseo del HTML, más los tiles de Esri, incluso en
   pantallas donde el mapa está muy abajo o no se abre nunca. Ahora se baja
   recién cuando hace falta dibujar uno. Si una página todavía lo trae por su
   propio <script>, esto resuelve al instante y no pide nada. */
const LEAFLET_VER = '1.9.4';
let leafletPromise = null;
function tribuLoadLeaflet(){
  if(typeof L !== 'undefined') return Promise.resolve();
  if(leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@' + LEAFLET_VER + '/dist/leaflet.css';
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    css.crossOrigin = '';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@' + LEAFLET_VER + '/dist/leaflet.js';
    js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    js.crossOrigin = '';
    js.onload = () => resolve();
    js.onerror = () => { leafletPromise = null; reject(new Error('No se pudo cargar Leaflet')); };
    document.head.appendChild(js);
  });
  return leafletPromise;
}

/* Igual que tribuLoadLeaflet pero espera a que el elemento esté por entrar en
   pantalla. Para los mapas que viven abajo del fold. */
function tribuLeafletWhenVisible(el){
  if(!('IntersectionObserver' in window)) return tribuLoadLeaflet();
  return new Promise(resolve => {
    const io = new IntersectionObserver(entries => {
      if(entries.some(e => e.isIntersecting)){
        io.disconnect();
        resolve(tribuLoadLeaflet());
      }
    }, { rootMargin:'300px 0px' });
    io.observe(el);
  });
}

function tribuMapTiles(){
  return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  });
}
/* Saca el prefijo "Leaflet |" y deja solo el crédito corto de arriba, para que
   el cartel de atribución no tape mapas chicos (pasaba con la lista completa
   de socios de Esri, que Leaflet mostraba envuelta en 3 líneas). Llamar
   después de sumar el mapa al DOM. */
function tribuMapChrome(map){
  if(map.attributionControl) map.attributionControl.setPrefix(false);
}

/* Nav: fondo al scrollear */
const nav = document.getElementById('nav');
/* Páginas con header propio (ej. el portal) no tienen #nav ni menú mobile. */
const onScroll = () => { if(nav) nav.classList.toggle('scrolled', window.scrollY > 40); };
onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

/* Menú mobile */
const burger = document.getElementById('burger');
const menu = document.getElementById('mobileMenu');
let menuOpenScrollY = 0;
const toggleMenu = (open) => {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
  if(open) menuOpenScrollY = window.scrollY;
};
if(burger && menu){
  burger.addEventListener('click', () => toggleMenu(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
}
/* Cerrar el menú suavemente si se scrollea la página detrás */
window.addEventListener('scroll', () => {
  if(menu && menu.classList.contains('open') && Math.abs(window.scrollY - menuOpenScrollY) > 4 && !menu.contains(document.activeElement)){
    toggleMenu(false);
  }
}, {passive:true});

/* Reveal al scrollear */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if(reduce){
  reveals.forEach(el => el.classList.add('in'));
}else{
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:.14, rootMargin:'0px 0px -8% 0px'});
  reveals.forEach(el => io.observe(el));
}

/* ============ FONDOS A DEMANDA (data-bg) ============
   Las fotos de fondo que están bien abajo (los "pick-card" y las historias)
   antes venían como style="background-image:url(...)" en el HTML, así que el
   navegador las pedía todas con prioridad alta durante la carga inicial: casi
   400 KB compitiendo con el hero. Ahora bajan recién cuando la tarjeta se
   acerca a la pantalla. */
(function(){
  const lazyBgs = document.querySelectorAll('[data-bg]');
  if(!lazyBgs.length) return;
  const show = el => {
    if(!el.dataset.bg) return;
    el.style.backgroundImage = 'url(' + el.dataset.bg + ')';
    delete el.dataset.bg;
  };
  if(!('IntersectionObserver' in window)){ lazyBgs.forEach(show); return; }
  const bgIO = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ show(e.target); bgIO.unobserve(e.target); } });
  }, { rootMargin:'400px 0px' });
  lazyBgs.forEach(el => bgIO.observe(el));
})();

/* Contador animado de stats */
const fmt = new Intl.NumberFormat('es-AR');
function animateNum(el){
  const target = +el.dataset.target;
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  if(reduce){ el.textContent = prefix + fmt.format(target) + suffix; return; }
  const dur = 1600; const t0 = performance.now();
  function tick(now){
    const p = Math.min((now - t0)/dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + fmt.format(Math.round(target * eased)) + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const statIO = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ animateNum(e.target); statIO.unobserve(e.target); } });
}, {threshold:.6});
document.querySelectorAll('.stat .num').forEach(el => statIO.observe(el));

/* ============ CALENDARIO ============ */
(function(){
  const RUBROS = {
    festivales: { label:'Festivales', color:'#F4A623' },
    ferias:     { label:'Ferias & Expos', color:'#36B7C4' },
    artisticos: { label:'Eventos artísticos', color:'#9B7CB8' },
    holistico:  { label:'Holístico & Bienestar', color:'#9BCB46' },
    musica:     { label:'Música & Danza', color:'#D24B62' },
    talleres:   { label:'Talleres', color:'#67C08A' }
  };
  // 🔧 EDITABLE: agregá o modificá eventos acá. rubro: festivales | ferias | artisticos | holistico | musica | talleres · status: Confirmado | Pendiente
  const EVENTS = [
    /* 🔎 18/09/2026: se sacaron del calendario todos los eventos que no se pudieron
       confirmar en el Instagram @tribuconnection (Festival Holístico MAYA, Encuentro
       Holístico Villa Gesell, Buenos Aires Zen, Expotécnica, Expo Eficiencia
       Energética, IX CONEBIOS, X Congreso SETAC, Primer Congreso Argentino de
       Sustentabilidad). Solo queda lo verificado ahí. */
    { date:'2026-11-20', title:'Amanita Festival — El Portal', place:'Mercedes, Buenos Aires (90 min de CABA)', time:'', rubro:'festivales', status:'Confirmado', url:'https://www.amanitafestival.com/', lat:-34.6497, lng:-59.4317 },
    { date:'2026-11-21', title:'Amanita Festival — El Portal', place:'Mercedes, Buenos Aires (90 min de CABA)', time:'', rubro:'festivales', status:'Confirmado', url:'https://www.amanitafestival.com/', lat:-34.6497, lng:-59.4317 },
    { date:'2026-11-22', title:'Amanita Festival — El Portal', place:'Mercedes, Buenos Aires (90 min de CABA)', time:'', rubro:'festivales', status:'Confirmado', url:'https://www.amanitafestival.com/', lat:-34.6497, lng:-59.4317 },
    { date:'2026-11-23', title:'Amanita Festival — El Portal', place:'Mercedes, Buenos Aires (90 min de CABA)', time:'', rubro:'festivales', status:'Confirmado', url:'https://www.amanitafestival.com/', lat:-34.6497, lng:-59.4317 },
    { date:'2026-11-24', title:'Amanita Festival — El Portal', place:'Mercedes, Buenos Aires (90 min de CABA)', time:'', rubro:'festivales', status:'Confirmado', url:'https://www.amanitafestival.com/', lat:-34.6497, lng:-59.4317 },
    /* 🔎 Sumados a partir de una revisión del Instagram @tribuconnection (18/09/2026) */
    { date:'2026-09-27', title:'Cacao Dance — Pulsar Orgánico', place:'Fuel Club, Palermo, CABA', time:'', rubro:'musica', status:'Confirmado', url:'https://www.instagram.com/pulsarorganico/', lat:-34.5875, lng:-58.4306 },
    { date:'2026-10-24', title:'Fiesta Sana', place:'Casa Temple, Palermo, CABA', time:'', rubro:'musica', status:'Confirmado', url:'https://www.instagram.com/la.fiesta.sana/', lat:-34.5825, lng:-58.4368 }
  ];
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const MES_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  /* slug estable por título: se usa como "id" del evento en /agenda/evento/?id=... */
  function slugEvent(title){
    return String(title).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  }
  /* Expuestos globalmente para que /agenda/evento/ pueda armar la ficha del evento
     sin repetir la data acá. Se exponen ANTES del early-return de abajo, porque esa
     página no tiene el markup del calendario (#calDays) pero sí necesita EVENTS. */
  window.TRIBU_EVENTS = EVENTS;
  window.TRIBU_RUBROS = RUBROS;
  window.TRIBU_SLUG = slugEvent;
  /* Foto de cada evento: la propia si la tiene; si no, una foto real de la
     Tribu elegida siempre igual para el mismo evento (por su nombre), así se
     ve la misma en la agenda, el inicio y la Red Tribu. */
  const FOTOS_EVENTO = ['/assets/reels/reel1.jpg?v=3', '/assets/stories/musica-en-vivo.jpg?v=3', '/assets/reels/reel3.jpg?v=3', '/assets/stories/conciencia-festival.jpg?v=3', '/assets/reels/reel4.jpg?v=3', '/assets/stories/entrevistas-en-vivo.jpg?v=3', '/assets/stories/resonar-2026.jpg?v=3'];
  window.TRIBU_FOTO_EVENTO = e => {
    if(e && e.foto) return e.foto;
    let h = 0; for(const c of slugEvent((e && e.title) || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return FOTOS_EVENTO[h % FOTOS_EVENTO.length];
  };

  /* Eventos aprobados desde el panel de moderación (Supabase): se suman acá,
     en TODAS las páginas (no solo la Agenda), porque el home también lee
     window.TRIBU_EVENTS para "Este finde en Tribu". Un evento de varios días
     queda como una fila por día, igual que los cargados a mano arriba, para
     reusar toda la lógica existente de agrupamiento por título. */
  (async function cargarEventosAprobados(){
    if(typeof sb === 'undefined') return;
    const { data, error } = await sb.from('event_submissions').select('*').eq('estado', 'aprobado');
    if(error || !data || !data.length) return;
    const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    data.forEach(ev=>{
      const inicio = new Date(ev.fecha+'T00:00');
      const fin = ev.fecha_fin ? new Date(ev.fecha_fin+'T00:00') : inicio;
      for(let d = new Date(inicio); d <= fin; d.setDate(d.getDate()+1)){
        EVENTS.push({
          date: iso(d), title: ev.nombre, place: ev.lugar || '', time: ev.hora || '',
          rubro: ev.rubro, status: 'Confirmado', url: ev.url || '',
          lat: ev.lat!=null ? Number(ev.lat) : null, lng: ev.lng!=null ? Number(ev.lng) : null
        });
      }
    });
    document.dispatchEvent(new CustomEvent('tribu:events-updated'));
  })();

  const daysEl = document.getElementById('calDays');
  const listEl = document.getElementById('calList');
  const monthEl = document.getElementById('calMonth');
  const filtersEl = document.getElementById('calFilters');
  const countEl = document.getElementById('calCount');
  const agendaTitle = document.querySelector('.cal-agenda-title');
  if(!daysEl) return;
  const today = new Date(); today.setHours(0,0,0,0);
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let filter = 'all';
  let selected = null;
  const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const color = r => (RUBROS[r]||{}).color || '#8A8D98';
  const pass = e => filter==='all' || e.rubro===filter;

  /* Eventos de varios días (ej. Amanita 20 al 24/11) están cargados como una fila
     por día. Acá agrupamos por título para saber, de cada uno, cuál es el primer
     día (el único que se muestra/clickea en el calendario) y el último (para
     mostrar "hasta el ..."), en vez de listarlo repetido día por día. */
  const RANGO = {};
  function computeRango(){
    Object.keys(RANGO).forEach(k => delete RANGO[k]);
    EVENTS.forEach(e=>{
      const g = RANGO[e.title];
      if(!g) RANGO[e.title] = { start:e.date, end:e.date };
      else { if(e.date < g.start) g.start = e.date; if(e.date > g.end) g.end = e.date; }
    });
  }
  computeRango();
  const esInicio = e => e.date === RANGO[e.title].start;
  function fmtRango(e){
    const { start, end } = RANGO[e.title];
    const d1 = new Date(start+'T00:00'), d2 = new Date(end+'T00:00');
    if(start === end) return d1.getDate()+' de '+MESES[d1.getMonth()]+' de '+d1.getFullYear();
    if(d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth()){
      return d1.getDate()+' al '+d2.getDate()+' de '+MESES[d1.getMonth()]+' de '+d1.getFullYear();
    }
    if(d1.getFullYear()===d2.getFullYear()){
      return d1.getDate()+' de '+MESES[d1.getMonth()]+' al '+d2.getDate()+' de '+MESES[d2.getMonth()]+' de '+d1.getFullYear();
    }
    return d1.getDate()+' de '+MESES[d1.getMonth()]+' de '+d1.getFullYear()+' al '+d2.getDate()+' de '+MESES[d2.getMonth()]+' de '+d2.getFullYear();
  }
  /* Solo el primer día de cada evento cuenta para los puntitos/click del calendario
     y para las tarjetas — así un evento de 5 días no se repite 5 veces. */
  const evByDate = ds => EVENTS.filter(e => e.date===ds && esInicio(e) && pass(e)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));

  function renderFilters(){
    let html = '<button class="cal-filter'+(filter==='all'?' active':'')+'" data-f="all">Todos</button>';
    Object.keys(RUBROS).forEach(k=>{
      html += '<button class="cal-filter'+(filter===k?' active':'')+'" data-f="'+k+'"><i style="background:'+RUBROS[k].color+'"></i>'+esc(RUBROS[k].label)+'</button>';
    });
    filtersEl.innerHTML = html;
    filtersEl.querySelectorAll('.cal-filter').forEach(b=> b.addEventListener('click', ()=>{ filter=b.dataset.f; selected=null; renderFilters(); render(); renderList(); renderMap(); }));
  }

  /* ============ MAPA DE EVENTOS (Leaflet + OpenStreetMap) ============ */
  let calMap = null, calMarkers = [];
  function renderMap(){
    if(!calMap) return; // el mapa se inicializa recién al abrir la vista Mapa
    calMarkers.forEach(m => calMap.removeLayer(m));
    calMarkers = [];
    const seen = new Set();
    const pts = [];
    EVENTS.filter(pass).forEach(e=>{
      if(e.lat==null || e.lng==null || seen.has(e.title)) return;
      seen.add(e.title);
      const dIni = EVENTS.filter(x=>x.title===e.title).map(x=>x.date).sort()[0];
      const d = new Date(dIni+'T00:00');
      const icon = L.divIcon({ className:'', html:'<div class="cal-pin-badge" style="background:'+color(e.rubro)+'"></div>', iconSize:[26,26], iconAnchor:[13,26], popupAnchor:[0,-24] });
      const marker = L.marker([e.lat, e.lng], { icon }).addTo(calMap);
      marker.bindPopup(
        '<div class="map-pop-cat"><i style="background:'+color(e.rubro)+'"></i>'+esc((RUBROS[e.rubro]||{}).label||e.rubro)+'</div>'+
        '<div class="map-pop-title">'+esc(e.title)+'</div>'+
        '<div class="map-pop-meta">'+d.getDate()+' de '+MESES[d.getMonth()]+' · 📍 '+esc(e.place||'')+'</div>'+
        '<a href="/agenda/evento/?id='+encodeURIComponent(slugEvent(e.title))+'" style="display:inline-block;margin-top:.5rem;font-size:.8rem;color:var(--teal)">Ver ficha del evento →</a>'
      );
      calMarkers.push(marker);
      pts.push([e.lat, e.lng]);
    });
    if(pts.length) calMap.fitBounds(pts, { padding:[36,36], maxZoom:9 });
  }
  let mapBooting = false;
  function initMap(){
    if(calMap || mapBooting) return;
    mapBooting = true;
    const el = document.getElementById('calMap');
    tribuLeafletWhenVisible(el).then(() => {
      if(calMap) return;
      calMap = L.map('calMap', { scrollWheelZoom:true }).setView([-38.4, -63.6], 4);
      tribuMapTiles().addTo(calMap);
      tribuMapChrome(calMap);
      renderMap();
    }).catch(() => { mapBooting = false; });
  }
  /* Calendario, agenda y mapa se ven siempre juntos (no hay pestañas) — el
     mapa se inicializa de una, no espera a que alguien lo abra. */
  if(document.getElementById('calMap')) initMap();

  /* La altura del calendario es la que manda (nunca se estira ella para
     igualar a las otras: eso deja huecos feos). La lista y el mapa se
     ajustan a esa altura natural; lo que no entra en la lista se recorre
     con las flechitas, no con una barra de scroll cruda. */
  const calCard = document.querySelector('.cal-card');
  const calListArrows = document.getElementById('calListArrows');
  const calListUp = document.getElementById('calListUp');
  const calListDown = document.getElementById('calListDown');
  function syncAgendaHeights(){
    if(!calCard) return;
    const mapEl = document.getElementById('calMap');
    const apilado = window.innerWidth <= 860;
    if(apilado){
      listEl.style.maxHeight = '';
      if(mapEl) mapEl.style.height = '';
      if(calListArrows) calListArrows.classList.add('is-hidden');
      return;
    }
    const h = calCard.getBoundingClientRect().height;
    listEl.style.maxHeight = h + 'px';
    const dosColumnas = window.innerWidth <= 1300;
    if(mapEl){
      mapEl.style.height = dosColumnas ? '' : h + 'px';
      if(!dosColumnas && calMap) setTimeout(()=> calMap.invalidateSize(), 60);
    }
    actualizarFlechasLista();
  }
  function actualizarFlechasLista(){
    if(!calListArrows) return;
    const puedeScrollear = listEl.scrollHeight > listEl.clientHeight + 4;
    calListArrows.classList.toggle('is-hidden', !puedeScrollear || window.innerWidth <= 860);
    if(!puedeScrollear) return;
    calListUp.disabled = listEl.scrollTop <= 4;
    calListDown.disabled = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 4;
  }
  function scrollListaSuave(delta){
    listEl.scrollTop = Math.max(0, Math.min(listEl.scrollTop + delta, listEl.scrollHeight - listEl.clientHeight));
  }
  if(calListUp) calListUp.addEventListener('click', ()=> scrollListaSuave(-160));
  if(calListDown) calListDown.addEventListener('click', ()=> scrollListaSuave(160));
  listEl.addEventListener('scroll', actualizarFlechasLista);
  window.addEventListener('resize', syncAgendaHeights);

  function evCard(e){
    const g = RANGO[e.title];
    const d = new Date(g.start+'T00:00');
    const dEnd = new Date(g.end+'T00:00');
    const multiDia = g.start !== g.end;
    const href = ' href="/agenda/evento/?id='+encodeURIComponent(slugEvent(e.title))+'"';
    const st = e.status==='Pendiente' ? '<span class="ev-status st-pend">Pendiente</span>' : '';
    return '<a class="ev"'+href+'>'+
      '<div class="ev-date">'+(multiDia
        ? '<b class="ev-date-range">'+d.getDate()+'<i>al</i>'+dEnd.getDate()+'</b>'
        : '<b>'+d.getDate()+'</b>')+'<span>'+MES_ABR[d.getMonth()]+'</span></div>'+
      '<div class="ev-img" style="background-image:url('+window.TRIBU_FOTO_EVENTO(e)+')"></div>'+
      '<div class="ev-body">'+
        '<div class="ev-head"><span class="ev-cat"><i style="background:'+color(e.rubro)+'"></i>'+esc((RUBROS[e.rubro]||{}).label||e.rubro)+'</span>'+st+'</div>'+
        '<div class="ev-title">'+esc(e.title)+'</div>'+
        '<div class="ev-meta">'+ (multiDia ? 'Hasta el '+dEnd.getDate()+' de '+MESES[dEnd.getMonth()]+' · ' : (e.time?esc(e.time)+' · ':'')) + '<span class="ev-loc">📍 '+esc(e.place||'')+'</span></div>'+
      '</div></a>';
  }

  function renderList(dateStr, heading){
    let evs, title;
    if(dateStr){ evs = evByDate(dateStr); title = heading; }
    else { evs = EVENTS.filter(e=> pass(e) && esInicio(e) && new Date(RANGO[e.title].end+'T00:00') >= today).sort((a,b)=>a.date.localeCompare(b.date)); title='Próxima agenda'; }
    if(agendaTitle) agendaTitle.firstChild.textContent = title+' ';
    countEl.textContent = evs.length ? evs.length+(evs.length===1?' evento':' eventos') : '';
    if(!evs.length){ listEl.innerHTML = '<p class="cal-empty">No hay eventos'+(dateStr?' para este día':'')+'. Probá con otro filtro o mes.</p>'; actualizarFlechasLista(); return; }
    listEl.innerHTML = evs.map(evCard).join('');
    listEl.scrollTop = 0;
    actualizarFlechasLista();
  }

  function render(){
    monthEl.textContent = MESES[view.getMonth()] + ' ' + view.getFullYear();
    daysEl.innerHTML = '';
    const start = new Date(view.getFullYear(), view.getMonth(), 1).getDay(); // domingo = 0
    const total = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
    const prevTotal = new Date(view.getFullYear(), view.getMonth(), 0).getDate();
    for(let i=0;i<start;i++){ const c=document.createElement('div'); c.className='cal-day other'; c.textContent=prevTotal-start+1+i; daysEl.appendChild(c); }
    for(let day=1; day<=total; day++){
      const dObj = new Date(view.getFullYear(), view.getMonth(), day);
      const ds = iso(dObj);
      const evs = evByDate(ds);
      const cell = document.createElement('button');
      cell.type='button'; cell.className='cal-day';
      if(iso(today)===ds) cell.classList.add('today');
      if(selected===ds) cell.classList.add('sel');
      let dots='';
      [...new Set(evs.map(e=>e.rubro))].slice(0,4).forEach(r=> dots+='<i style="background:'+color(r)+'"></i>');
      cell.innerHTML = '<span>'+day+'</span>'+(dots?'<span class="cal-dots">'+dots+'</span>':'');
      if(evs.length){
        cell.classList.add('has-ev');
        cell.addEventListener('click', ()=>{
          selected=ds;
          document.querySelectorAll('.cal-day.sel').forEach(x=>x.classList.remove('sel'));
          cell.classList.add('sel');
          renderList(ds, dObj.getDate()+' de '+MESES[dObj.getMonth()]);
        });
      }
      daysEl.appendChild(cell);
    }
    const trailing=(7-((start+total)%7))%7;
    for(let i=1;i<=trailing;i++){ const c=document.createElement('div'); c.className='cal-day other'; c.textContent=i; daysEl.appendChild(c); }
    setTimeout(syncAgendaHeights, 0);
  }
  document.getElementById('calPrev').addEventListener('click', ()=>{ view.setMonth(view.getMonth()-1); render(); });
  document.getElementById('calNext').addEventListener('click', ()=>{ view.setMonth(view.getMonth()+1); render(); });
  document.getElementById('calToday').addEventListener('click', ()=>{ view=new Date(today.getFullYear(),today.getMonth(),1); selected=null; render(); renderList(); });
  renderFilters(); render(); renderList();

  /* Si cargarEventosAprobados() (definida arriba) suma eventos nuevos al
     array EVENTS, volvemos a dibujar todo el calendario con los datos ya
     completos. */
  document.addEventListener('tribu:events-updated', ()=>{
    computeRango();
    renderFilters(); render(); renderList(); renderMap();
  });
})();

/* ============ MINI MAPA DECORATIVO (home, "Explorá por mapa") ============
   Solo de vidriera: sin drag/zoom/controles propios, toda la tarjeta lleva a
   /agenda/ al clickear (salvo el link de atribución de Esri, que respeta su
   propio destino). */
(function(){
  const el = document.getElementById('miniMapHome');
  if(!el) return;

  /* La tarjeta entera lleva a /agenda/ — eso tiene que funcionar desde el
     primer momento, aunque el mapa decorativo todavía no haya bajado. */
  const wrap = document.getElementById('mapCtaEmbed');
  const ir = () => { window.location.href = '/agenda/'; };
  wrap.addEventListener('click', e => { if(!e.target.closest('.leaflet-control-attribution')) ir(); });
  wrap.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ir(); } });

  /* Está bien abajo del fold: Leaflet y los tiles se piden recién cuando la
     sección se acerca a la pantalla. */
  tribuLeafletWhenVisible(el).then(() => {
    const map = L.map('miniMapHome', {
      zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false,
      touchZoom:false, boxZoom:false, keyboard:false, tap:false
    }).setView([-34.62, -58.5], 10);
    tribuMapTiles().addTo(map);
    tribuMapChrome(map);
    window.addEventListener('resize', () => map.invalidateSize());
  }).catch(() => {});
})();

/* ============ PROVINCIAS Y CIUDADES (Argentina) ============ */
const PROVINCIAS_AR = {
  'Ciudad Autónoma de Buenos Aires': ['Ciudad Autónoma de Buenos Aires'],
  'Buenos Aires': ['La Plata','Mar del Plata','Bahía Blanca','Tandil','San Isidro','Vicente López','Quilmes','Lanús','Avellaneda','Morón','Tigre','Pilar','Escobar','San Nicolás de los Arroyos','Necochea','Olavarría','Junín','Villa Gesell','Pinamar'],
  'Catamarca': ['San Fernando del Valle de Catamarca','Andalgalá','Belén','Recreo','Tinogasta'],
  'Chaco': ['Resistencia','Presidencia Roque Sáenz Peña','Villa Ángela','Charata'],
  'Chubut': ['Comodoro Rivadavia','Trelew','Puerto Madryn','Rawson','Esquel'],
  'Córdoba': ['Córdoba Capital','Río Cuarto','Villa María','San Francisco','Alta Gracia','Villa Carlos Paz','Jesús María','Bell Ville'],
  'Corrientes': ['Corrientes Capital','Goya','Mercedes','Paso de los Libres'],
  'Entre Ríos': ['Paraná','Concordia','Gualeguaychú','Concepción del Uruguay','Colón','Villaguay'],
  'Formosa': ['Formosa Capital','Clorinda','Pirané'],
  'Jujuy': ['San Salvador de Jujuy','Palpalá','Perico','Libertador General San Martín','Tilcara','Humahuaca'],
  'La Pampa': ['Santa Rosa','General Pico','Realicó'],
  'La Rioja': ['La Rioja Capital','Chilecito','Chamical'],
  'Mendoza': ['Mendoza Capital','San Rafael','Godoy Cruz','Maipú','Luján de Cuyo','Guaymallén','Tunuyán','Malargüe'],
  'Misiones': ['Posadas','Oberá','Puerto Iguazú','Eldorado'],
  'Neuquén': ['Neuquén Capital','San Martín de los Andes','Villa La Angostura','Cutral Có','Zapala'],
  'Río Negro': ['Viedma','San Carlos de Bariloche','General Roca','Cipolletti','El Bolsón'],
  'Salta': ['Salta Capital','San Ramón de la Nueva Orán','Tartagal','Cafayate','Rosario de la Frontera'],
  'San Juan': ['San Juan Capital','Rawson','Chimbas','Rivadavia'],
  'San Luis': ['San Luis Capital','Villa Mercedes','Merlo'],
  'Santa Cruz': ['Río Gallegos','Caleta Olivia','El Calafate','Puerto Deseado'],
  'Santa Fe': ['Santa Fe Capital','Rosario','Rafaela','Venado Tuerto','Reconquista','San Lorenzo','Casilda'],
  'Santiago del Estero': ['Santiago del Estero Capital','La Banda','Termas de Río Hondo','Añatuya'],
  'Tierra del Fuego': ['Ushuaia','Río Grande','Tolhuin'],
  'Tucumán': ['San Miguel de Tucumán','Yerba Buena','Tafí Viejo','Concepción','Tafí del Valle']
};

/* ============ MODAL CONECTARME A LA TRIBU ============ */
(function(){
  const overlay = document.getElementById('connectModal');
  if(!overlay) return;
  const form = document.getElementById('connectForm');
  const msg = document.getElementById('connectMsg');
  const chips = document.getElementById('connectChips');
  const perfilError = document.getElementById('connectPerfilError');

  /* Provincia -> Ciudad en cascada, con opción "Otra localidad" a texto libre */
  const provSel = document.getElementById('cProvincia');
  const ciudadSel = document.getElementById('cCiudad');
  const ciudadOtra = document.getElementById('cCiudadOtra');
  Object.keys(PROVINCIAS_AR).forEach(p=>{
    const o = document.createElement('option'); o.value = p; o.textContent = p;
    provSel.appendChild(o);
  });
  provSel.addEventListener('change', ()=>{
    const ciudades = PROVINCIAS_AR[provSel.value] || [];
    ciudadOtra.style.display = 'none'; ciudadOtra.value = '';
    if(!ciudades.length){
      ciudadSel.innerHTML = '<option value="">Elegí tu provincia primero</option>';
      ciudadSel.disabled = true;
      return;
    }
    ciudadSel.disabled = false;
    ciudadSel.innerHTML = '<option value="">Elegí tu ciudad</option>'
      + ciudades.map(c => '<option value="'+c+'">'+c+'</option>').join('')
      + '<option value="Otra">Otra localidad</option>';
  });
  ciudadSel.addEventListener('change', ()=>{
    ciudadOtra.style.display = ciudadSel.value === 'Otra' ? 'block' : 'none';
    if(ciudadSel.value !== 'Otra') ciudadOtra.value = '';
  });
  const open = (trigger)=>{
    perfilError.classList.remove('show'); chips.classList.remove('is-invalid');
    /* Si el disparador trae data-perfil (las tarjetas de "Distintos caminos"), dejamos ese
       chip ya marcado para que la persona no repita lo que acaba de elegir. */
    const perfil = trigger && trigger.dataset ? trigger.dataset.perfil : '';
    if(perfil){
      const radio = form.querySelector('input[name="Perfil"][value="'+perfil+'"]');
      if(radio) radio.checked = true;
    }
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  };
  const close = ()=>{ overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); document.body.style.overflow=''; };
  /* Delegado en document (no querySelectorAll+forEach) para que también funcionen los
     botones [data-connect] que se agregan al DOM después de cargar este script — como
     el de la ficha de evento, armado con JS. */
  document.addEventListener('click', e=>{
    const trigger = e.target.closest('[data-connect]');
    if(!trigger) return;
    e.preventDefault();
    open(trigger);
  });
  document.getElementById('connectClose').addEventListener('click', close);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && overlay.classList.contains('open')) close(); });

  /* La opción "¿Cómo te querés conectar?" son radios ocultos (chips): el cartel
     nativo de "elegí una opción" queda pegado a un input invisible y no se ve.
     Validamos a mano y mostramos un mensaje visible dentro del modal. */
  chips.addEventListener('change', ()=>{ perfilError.classList.remove('show'); chips.classList.remove('is-invalid'); });

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const fdCheck = new FormData(form);
    if(fdCheck.get('_honey')){ form.style.display='none'; msg.style.display='block'; return; }
    if(!form.querySelector('input[name="Perfil"]:checked')){
      perfilError.classList.add('show'); chips.classList.add('is-invalid');
      chips.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    const btn = document.getElementById('connectSubmit');
    btn.textContent='Enviando...'; btn.disabled=true;
    const fd = new FormData(form);
    fd.set('Perfil', fd.getAll('Perfil').join(', '));
    if(fd.get('Ciudad') === 'Otra') fd.set('Ciudad', fd.get('Ciudad_Otra') || '');
    fd.delete('Ciudad_Otra');
    try{
      await enviarASheets(fd, 'Conectar');
      form.style.display='none'; msg.style.display='block';
    }catch(err){
      const body = encodeURIComponent('Nombre: '+(fd.get('Nombre')||'')+'\nPerfil: '+fd.getAll('Perfil').join(', ')+'\nMarca/Proyecto: '+(fd.get('Marca_Evento')||'')+'\nContacto: '+(fd.get('Contacto')||'')+'\nDetalles: '+(fd.get('Detalles')||'')+'\nFecha de nacimiento: '+(fd.get('Fecha_Nacimiento')||'')+'\nProvincia: '+(fd.get('Provincia')||'')+'\nCiudad: '+(fd.get('Ciudad')||''));
      window.location.href='mailto:contacto@tribuconnection.com?subject=Quiero%20conectarme%20a%20la%20Tribu&body='+body;
    }finally{ btn.textContent='Enviar'; btn.disabled=false; }
  });
})();

/* ============ MODAL "SUMÁ TU PROPUESTA" (los dos caminos) ============
   La sección "Sumá tu propuesta" del menú no abre un formulario: abre primero
   la descripción de los dos perfiles, y desde ahí cada uno lleva a su landing
   (creadores en rojo, marcas en celeste).
   El markup lo arma acá y no en cada HTML porque el ítem está en el menú de
   todas las páginas: así hay una sola copia del texto y del diseño. */
(function(){
  const CAMINOS = [
    {
      color:'var(--red)', href:'/organizas-experiencias/', foto:'/assets/tarjetas/camino-creas.jpg?v=2', alt:'Público de un festival levantando las manos',
      titulo:'CREÁS', que:'Experiencias, actividades, eventos, arte, encuentros.',
      texto:'Si estás dando vida a una propuesta que reúne personas, te ayudamos a hacerla crecer, conectar con más gente y generar un impacto que perdure.',
      cta:'Conocé cómo podemos acompañarte',
      /* Destello: el mismo símbolo que identifica a Creadores en la Red Tribu. */
      ic:'<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c.9 5 1.6 5.7 6.6 6.6-5 .9-5.7 1.6-6.6 6.6-.9-5-1.6-5.7-6.6-6.6C10.4 7.7 11.1 7 12 2z"/><path d="M18.5 15c.4 2.2.8 2.6 3 3-2.2.4-2.6.8-3 3-.4-2.2-.8-2.6-3-3 2.2-.4 2.6-.8 3-3z"/></svg>'
    },
    {
      color:'var(--teal)', href:'/representas-marca/', foto:'/assets/tarjetas/camino-impulsas.jpg?v=2', alt:'Entrevista de Tribu a una marca en su stand',
      titulo:'IMPULSÁS', que:'Una marca, un espacio, un emprendimiento, una organización.',
      texto:'Creamos conexiones genuinas entre tu marca y comunidades afines, desarrollando estrategias y acciones de colaboración y beneficio mutuo.',
      cta:'Potenciá tu marca',
      /* Etiqueta: el mismo símbolo que identifica a Marca en la Red Tribu. */
      ic:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/></svg>'
    }
  ];

  let overlay = null;

  function construir(){
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'caminosModal';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="modal modal--caminos" role="dialog" aria-modal="true" aria-labelledby="caminosTitle">' +
        '<button class="modal-close" type="button" aria-label="Cerrar">✕</button>' +
        '<h2 id="caminosTitle">Sumá tu propuesta</h2>' +
        '<p class="modal-sub">Hay dos formas de sumarse a la Tribu. Elegí la que te represente y te contamos cómo podemos acompañarte.</p>' +
        '<div class="caminos-grid">' +
          CAMINOS.map(c =>
            '<a class="camino-card con-foto" href="' + c.href + '" style="--c:' + c.color + '">' +
              '<img class="camino-img" src="' + c.foto + '" alt="' + c.alt + '" width="720" height="540">' +
              '<h3>' + c.titulo + '</h3>' +
              '<p class="camino-que">' + c.que + '</p>' +
              '<p>' + c.texto + '</p>' +
              '<span class="camino-cta">' + c.cta + ' <span class="arr" aria-hidden="true">→</span></span>' +
            '</a>'
          ).join('') +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click', cerrar);
    overlay.addEventListener('click', e => { if(e.target === overlay) cerrar(); });
  }

  /* Al abrir la ventana se precargan las dos landings: en Chrome/Edge quedan
     pre-renderizadas (speculation rules) y en el resto al menos descargadas
     (prefetch). Así, cuando la persona elige un camino, la página aparece al
     instante en vez de empezar a bajar recién con el clic. */
  let precargado = false;
  function precargar(){
    if(precargado) return;
    precargado = true;
    const urls = CAMINOS.map(c => c.href).filter(h => h !== location.pathname);
    if(HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')){
      const s = document.createElement('script');
      s.type = 'speculationrules';
      s.textContent = JSON.stringify({ prerender: [{ source:'list', urls }] });
      document.head.appendChild(s);
    } else {
      urls.forEach(u => { const l = document.createElement('link'); l.rel = 'prefetch'; l.href = u; document.head.appendChild(l); });
    }
  }

  function abrir(){
    if(!overlay) construir();
    precargar();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    /* El foco arranca en la primera tarjeta: se puede elegir con el teclado. */
    const primera = overlay.querySelector('.camino-card');
    if(primera) primera.focus();
  }
  function cerrar(){
    if(!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-caminos]');
    if(!trigger) return;
    e.preventDefault();
    abrir();
  });
  /* Con el mouse encima de "Sumá tu propuesta" ya se empiezan a precargar. */
  document.addEventListener('pointerover', e => { if(e.target.closest && e.target.closest('[data-caminos]')) precargar(); }, { passive:true });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && overlay && overlay.classList.contains('open')) cerrar();
  });
})();

/* ============ MODAL PROPUESTA A MEDIDA ============ */
(function(){
  const overlay = document.getElementById('propuestaModal');
  if(!overlay) return;
  const form = document.getElementById('propForm');
  const msg = document.getElementById('propMsg');
  const open = ()=>{ overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; };
  const close = ()=>{ overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); document.body.style.overflow=''; };
  document.addEventListener('click', e=>{
    const trigger = e.target.closest('[data-propuesta]');
    if(!trigger) return;
    e.preventDefault();
    open();
  });
  document.getElementById('propClose').addEventListener('click', close);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && overlay.classList.contains('open')) close(); });

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const fdCheck = new FormData(form);
    if(fdCheck.get('_honey')){ form.style.display='none'; msg.style.display='block'; return; }
    const btn = document.getElementById('propSubmit');
    btn.textContent='Enviando...'; btn.disabled=true;
    const fd = new FormData(form);
    try{
      await enviarASheets(fd, 'Propuesta');
      form.style.display='none'; msg.style.display='block';
    }catch(err){
      const body = encodeURIComponent('Nombre: '+(fd.get('Nombre')||'')+'\nMarca/Evento: '+(fd.get('Marca_Evento')||'')+'\nContacto: '+(fd.get('Contacto')||'')+'\nDetalles: '+(fd.get('Detalles')||''));
      window.location.href='mailto:contacto@tribuconnection.com?subject=Quiero%20una%20propuesta%20a%20medida&body='+body;
    }finally{ btn.textContent='Enviar'; btn.disabled=false; }
  });
})();

/* ============ MODAL SOLICITAR EVENTO ============ */
(function(){
  const overlay = document.getElementById('eventModal');
  if(!overlay) return;
  const openBtn = document.getElementById('calAdd');
  const open = ()=>{ overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; };
  const close = ()=>{ overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); document.body.style.overflow=''; };
  if(openBtn) openBtn.addEventListener('click', open);
  /* El buscador lleva a /agenda/#agregar-evento: abre el formulario directo. */
  if(location.hash === '#agregar-evento') open();
  document.getElementById('eventClose').addEventListener('click', close);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && overlay.classList.contains('open')) close(); });

  const evForm = document.getElementById('eventForm');
  const evMsg = document.getElementById('evMsg');
  evForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const rubroInput = document.getElementById('evRubro');
    if(!rubroInput.value){
      const rubroBtn = document.getElementById('rubroSel').querySelector('.cselect-btn');
      rubroBtn.style.borderColor='var(--red)';
      document.getElementById('rubroSel').scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    const fdCheck = new FormData(evForm);
    if(fdCheck.get('_honey')){ evForm.style.display='none'; evMsg.style.display='block'; return; }
    const btn = document.getElementById('evSubmit');
    btn.textContent='Enviando...'; btn.disabled=true;
    const fd = new FormData(evForm);
    /* Además del mail (Sheets), guardamos la solicitud en Supabase para que el
       equipo la apruebe desde el panel en vez de editar código a mano. Si esto
       falla no frenamos el envío: el mail de aviso sigue siendo el respaldo. */
    if(typeof sb !== 'undefined'){
      sb.from('event_submissions').insert({
        nombre: fd.get('Evento') || '',
        rubro: fd.get('Rubro') || 'talleres',
        fecha: fd.get('Fecha') || null,
        lugar: fd.get('Ubicacion') || null,
        lat: fd.get('Ubicacion_lat') || null,
        lng: fd.get('Ubicacion_lng') || null,
        etiquetas: fd.get('Etiquetas') || null,
        descripcion: fd.get('Descripcion') || null,
        link_media: fd.get('Link_media') || null
      }).then(({error})=>{ if(error) console.warn('event_submissions insert:', error.message); });
    }
    try{
      await enviarASheets(fd, 'Evento');
      evForm.style.display='none'; evMsg.style.display='block';
    }catch(err){
      const body = encodeURIComponent('Evento: '+(fd.get('Evento')||'')+'\nRubro: '+(fd.get('Rubro')||'')+'\nFecha: '+(fd.get('Fecha')||'')+'\nUbicación: '+(fd.get('Ubicacion')||'')+'\nEtiquetas: '+(fd.get('Etiquetas')||'')+'\nDescripción: '+(fd.get('Descripcion')||'')+'\nLink fotos/video: '+(fd.get('Link_media')||''));
      window.location.href='mailto:contacto@tribuconnection.com?subject=Solicitud%20para%20agregar%20evento%20al%20calendario&body='+body;
    }finally{ btn.textContent='Enviar solicitud'; btn.disabled=false; }
  });

  const fileIn = document.getElementById('evFiles'), fileName = document.getElementById('evFileName');
  if(fileIn) fileIn.addEventListener('change', ()=>{ fileName.textContent = fileIn.files.length ? [...fileIn.files].map(f=>f.name).join(', ') : ''; });

  /* Autocompletado de dirección (Nominatim/OpenStreetMap) + mini-mapa de confirmación */
  const locInput = document.getElementById('evLoc');
  const suggestBox = document.getElementById('evLocSuggest');
  const latInput = document.getElementById('evLat');
  const lngInput = document.getElementById('evLng');
  const previewEl = document.getElementById('evLocMap');
  let geoTimer = null, geoMap = null, geoMarker = null, lastQuery = '';
  const escHtml = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function showPreview(lat, lng, label){
    previewEl.classList.add('on');
    /* El mapita de la dirección aparece recién cuando alguien elige un lugar,
       así que Leaflet se baja acá y no en la carga del formulario. */
    tribuLoadLeaflet().then(()=> new Promise(r => setTimeout(r, 50))).then(()=>{
      if(!geoMap){
        geoMap = L.map('evLocMap', { zoomControl:false, attributionControl:false, scrollWheelZoom:true }).setView([lat,lng], 13);
        tribuMapTiles().addTo(geoMap);
      }
      geoMap.invalidateSize();
      geoMap.setView([lat,lng], 14);
      if(geoMarker) geoMap.removeLayer(geoMarker);
      geoMarker = L.marker([lat,lng]).addTo(geoMap);
      if(label) geoMarker.bindPopup(escHtml(label));
    }).catch(()=>{});
  }

  function selectPlace(item){
    locInput.value = item.display_name;
    latInput.value = item.lat;
    lngInput.value = item.lon;
    suggestBox.classList.remove('open');
    suggestBox.innerHTML = '';
    showPreview(+item.lat, +item.lon, item.display_name);
  }

  locInput.addEventListener('input', ()=>{
    latInput.value = ''; lngInput.value = '';
    const q = locInput.value.trim();
    clearTimeout(geoTimer);
    if(q.length < 3){ suggestBox.classList.remove('open'); return; }
    suggestBox.innerHTML = '<div class="geo-loading">Buscando…</div>';
    suggestBox.classList.add('open');
    geoTimer = setTimeout(async ()=>{
      lastQuery = q;
      try{
        const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&countrycodes=ar&q='+encodeURIComponent(q));
        const data = await res.json();
        if(q !== lastQuery) return; // llegó tarde, ya hay una búsqueda más nueva
        if(!data.length){ suggestBox.innerHTML = '<div class="geo-loading">Sin resultados. Probá con más detalle.</div>'; return; }
        suggestBox.innerHTML = '';
        data.forEach(item=>{
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = item.display_name;
          b.addEventListener('click', ()=> selectPlace(item));
          suggestBox.appendChild(b);
        });
      }catch(err){
        suggestBox.innerHTML = '<div class="geo-loading">No se pudo buscar. Escribí la dirección igual, la confirmamos por WhatsApp.</div>';
      }
    }, 450);
  });
  document.addEventListener('click', (e)=>{ if(!e.target.closest('.geo-field')) suggestBox.classList.remove('open'); });
})();

/* ============ SELECT Y FECHA PERSONALIZADOS (modal evento + fecha de nacimiento) ============ */
(function(){
  const cs = document.getElementById('rubroSel');
  const dp = document.getElementById('dateSel');
  const bp = document.getElementById('birthDateSel');
  const cpd = document.getElementById('cpDateSel');
  const openPickers = [cs, dp, bp, cpd].filter(Boolean);
  const closeAll = (except)=> openPickers.forEach(p => { if(p!==except) p.classList.remove('open'); });
  const pad = n => String(n).padStart(2,'0');
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  if(cs){
    const btn = cs.querySelector('.cselect-btn');
    const val = cs.querySelector('.cselect-val');
    const hidden = document.getElementById('evRubro');
    btn.addEventListener('click', e=>{ e.stopPropagation(); const willOpen=!cs.classList.contains('open'); closeAll(cs); cs.classList.toggle('open', willOpen); btn.setAttribute('aria-expanded', willOpen); btn.style.borderColor=''; });
    cs.querySelectorAll('.cselect-list button').forEach(o=>{
      o.addEventListener('click', ()=>{
        hidden.value = o.dataset.val;
        val.textContent = o.textContent;
        val.classList.remove('is-ph');
        cs.querySelectorAll('.cselect-list button').forEach(x=>x.classList.remove('sel'));
        o.classList.add('sel');
        cs.classList.remove('open');
      });
    });
  }

  /* Picker de fecha genérico: sirve tanto para la fecha del evento (arrows, cerca de hoy)
     como para la fecha de nacimiento (selects de mes/año para saltar décadas rápido, sin futuro). */
  function setupDatePicker(dp, cfg){
    if(!dp) return;
    const btn = dp.querySelector('.cselect-btn');
    const disp = dp.querySelector('.cselect-val');
    const hidden = document.getElementById(cfg.hiddenId);
    const monthEl = dp.querySelector('.cdate-month');
    const monthSel = dp.querySelector('.cdate-month-sel');
    const yearSel = dp.querySelector('.cdate-year-sel');
    const daysEl = dp.querySelector('.cdate-days');
    const today = new Date(); today.setHours(0,0,0,0);
    const isoToday = today.getFullYear()+'-'+pad(today.getMonth()+1)+'-'+pad(today.getDate());
    let view = new Date(today.getFullYear(), today.getMonth(), 1);
    let selected = null;
    const maxY = cfg.maxYear || today.getFullYear();
    const minY = cfg.minYear || (today.getFullYear()-90);

    if(monthSel){
      const MES_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      monthSel.innerHTML = MES_ABR.map((m,i)=> '<option value="'+i+'">'+m+'</option>').join('');
      monthSel.addEventListener('click', e=> e.stopPropagation());
      monthSel.addEventListener('change', ()=>{ view.setMonth(+monthSel.value); render(); });
    }
    if(yearSel){
      let opts=''; for(let y=maxY; y>=minY; y--) opts += '<option value="'+y+'">'+y+'</option>';
      yearSel.innerHTML = opts;
      yearSel.addEventListener('click', e=> e.stopPropagation());
      yearSel.addEventListener('change', ()=>{ view.setFullYear(+yearSel.value); render(); });
    }

    function clampView(){
      if(yearSel && view.getFullYear() < minY) view = new Date(minY, view.getMonth(), 1);
      if(yearSel && view.getFullYear() > maxY) view = new Date(maxY, view.getMonth(), 1);
      if(cfg.noFuture && view > today && (view.getFullYear()>today.getFullYear() || (view.getFullYear()===today.getFullYear() && view.getMonth()>today.getMonth()))){
        view = new Date(today.getFullYear(), today.getMonth(), 1);
      }
    }

    function pick(ds, d, m, y){ selected=ds; hidden.value=ds; disp.textContent=pad(d)+'/'+pad(m+1)+'/'+y; disp.classList.remove('is-ph'); dp.classList.remove('open'); }
    function render(){
      clampView();
      if(monthEl) monthEl.textContent = MESES[view.getMonth()] + ' ' + view.getFullYear();
      if(monthSel) monthSel.value = view.getMonth();
      if(yearSel) yearSel.value = view.getFullYear();
      daysEl.innerHTML='';
      const start = (new Date(view.getFullYear(), view.getMonth(), 1).getDay()+6)%7;
      const total = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
      for(let i=0;i<start;i++){ const s=document.createElement('span'); s.className='empty'; daysEl.appendChild(s); }
      for(let d=1; d<=total; d++){
        const b=document.createElement('button'); b.type='button'; b.textContent=d;
        const ds = view.getFullYear()+'-'+pad(view.getMonth()+1)+'-'+pad(d);
        if(cfg.noFuture && ds>isoToday){ b.disabled=true; b.classList.add('disabled'); daysEl.appendChild(b); continue; }
        if(ds===isoToday) b.classList.add('today');
        if(ds===selected) b.classList.add('sel');
        b.addEventListener('click', e=>{ e.stopPropagation(); pick(ds, d, view.getMonth(), view.getFullYear()); });
        daysEl.appendChild(b);
      }
    }
    btn.addEventListener('click', e=>{ e.stopPropagation(); const willOpen=!dp.classList.contains('open'); closeAll(dp); dp.classList.toggle('open', willOpen); if(willOpen) render(); });
    dp.querySelector('.cdate-pop').addEventListener('click', e=> e.stopPropagation());
    dp.querySelectorAll('[data-nav]').forEach(nb=> nb.addEventListener('click', e=>{ e.stopPropagation(); view.setMonth(view.getMonth()+parseInt(nb.dataset.nav,10)); render(); }));
    dp.querySelectorAll('[data-nav-month]').forEach(nb=> nb.addEventListener('click', e=>{ e.stopPropagation(); view.setMonth(view.getMonth()+parseInt(nb.dataset.navMonth,10)); render(); }));
    dp.querySelectorAll('[data-nav-year]').forEach(nb=> nb.addEventListener('click', e=>{ e.stopPropagation(); view.setFullYear(view.getFullYear()+parseInt(nb.dataset.navYear,10)); render(); }));
    const todayBtn = dp.querySelector('[data-today]');
    if(todayBtn) todayBtn.addEventListener('click', e=>{ e.stopPropagation(); view=new Date(today.getFullYear(),today.getMonth(),1); pick(isoToday, today.getDate(), today.getMonth(), today.getFullYear()); });
    dp.querySelector('[data-clear]').addEventListener('click', e=>{ e.stopPropagation(); selected=null; hidden.value=''; disp.textContent='dd/mm/aaaa'; disp.classList.add('is-ph'); render(); });
  }

  setupDatePicker(dp, { hiddenId:'evDate' });
  setupDatePicker(bp, { hiddenId:'cBirth', noFuture:true, minYear: new Date().getFullYear()-90, maxYear: new Date().getFullYear() });
  setupDatePicker(cpd, { hiddenId:'cpFechaVal', minYear: new Date().getFullYear(), maxYear: new Date().getFullYear()+3 });

  document.addEventListener('click', ()=> closeAll(null));
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeAll(null); });
})();

/* ============ COOKIE BAR + MODAL LEGAL ============ */
(function(){
  const bar = document.getElementById('cookieBar');
  const KEY = 'tribu_cookies_ok';
  if(bar && !localStorage.getItem(KEY)){
    setTimeout(()=> bar.classList.add('show'), 600);
  }
  const acceptBtn = document.getElementById('cookieAccept');
  if(acceptBtn) acceptBtn.addEventListener('click', ()=>{
    localStorage.setItem(KEY, '1');
    bar.classList.remove('show');
  });

  const legalOverlay = document.getElementById('legalModal');
  if(!legalOverlay) return;
  const legalClose = document.getElementById('legalClose');
  const tabs = legalOverlay.querySelectorAll('.legal-tabs button');
  const bodies = legalOverlay.querySelectorAll('.legal-body');

  function openLegal(tabName){
    tabs.forEach(t=> t.classList.toggle('active', t.dataset.tab===tabName));
    bodies.forEach(b=> b.style.display = (b.id==='legal-'+tabName) ? '' : 'none');
    legalOverlay.classList.add('open'); legalOverlay.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeLegal(){
    legalOverlay.classList.remove('open'); legalOverlay.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  /* Delegado: también lo usan links que se agregan después por JS (ej. los
     "términos"/"privacidad" del modal de registro de supabase-client.js). */
  document.addEventListener('click', (e)=>{
    const link = e.target.closest('[data-legal]');
    if(!link) return;
    e.preventDefault(); openLegal(link.dataset.legal);
  });
  tabs.forEach(t=> t.addEventListener('click', ()=> openLegal(t.dataset.tab)));
  legalClose.addEventListener('click', closeLegal);
  legalOverlay.addEventListener('click', e=>{ if(e.target===legalOverlay) closeLegal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && legalOverlay.classList.contains('open')) closeLegal(); });
})();

/* ============ BUSCADOR (nav) ============
   Busca en todo el sitio y lleva directo a lo que se elija:
   - secciones y páginas (con sus anclas),
   - personas y marcas de la Red Tribu (perfiles publicados),
   - experiencias publicadas y eventos de la agenda,
   - lugares (salen de los eventos, las experiencias y los perfiles),
   - marcas aliadas, historias destacadas y disciplinas del catálogo.
   Lo de Supabase y el catálogo de disciplinas se cargan recién la primera vez
   que alguien toca el buscador, así no pesan en la carga de la página. */
(function(){
  const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const MESES_ABR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const rt = (q, tab) => '/red-tribu/?' + (tab ? 'tab=' + tab + '&' : '') + 'q=' + encodeURIComponent(q);

  /* ---- Íconos por tipo de resultado ---- */
  const IC = {
    seccion:'<path d="M4 5h16M4 12h16M4 19h10"/>',
    persona:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    marca:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    lugar:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    evento:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    experiencia:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01"/>',
    historia:'<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="m10.5 9 4 3-4 3z"/>',
    disciplina:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    comunidad:'<circle cx="12" cy="8" r="3"/><circle cx="5" cy="10.5" r="2.2"/><circle cx="19" cy="10.5" r="2.2"/><path d="M7 20a5 5 0 0 1 10 0"/>',
    accion:'<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  const TIPO_LABEL = { seccion:'Sección', persona:'Creador/a', marca:'Marca', lugar:'Lugar', evento:'Evento', experiencia:'Experiencia', historia:'Historia', disciplina:'Disciplina', comunidad:'Comunidad', accion:'Acción' };

  /* ---- Lo fijo del sitio: páginas, secciones y acciones ----
     k = otras palabras con las que también se encuentra (cómo lo diría la gente). */
  const FIJOS = [
    { tipo:'seccion', t:'Inicio', s:'Página principal', u:'/', k:'home portada principal tribu connection' },
    { tipo:'seccion', t:'Este finde en Tribu', s:'Inicio', u:'/#agenda', k:'fin de semana finde eventos proximos que hacer hoy' },
    { tipo:'seccion', t:'Elegidos por Tribu', s:'Inicio', u:'/#elegidos', k:'selecciones recomendados imperdibles destacados' },
    { tipo:'seccion', t:'Historias que inspiran', s:'Inicio', u:'/#historias', k:'historias entrevistas reels articulos videos' },
    { tipo:'seccion', t:'Explorá por mapa', s:'Inicio', u:'/#mapa', k:'mapa cerca ubicacion donde' },
    { tipo:'seccion', t:'Agenda', s:'Calendario de eventos', u:'/agenda/', k:'calendario eventos fechas festivales ferias talleres' },
    { tipo:'seccion', t:'Red Tribu', s:'Creadores, comunidades, experiencias, marcas y lugares', u:'/red-tribu/', k:'red directorio personas facilitadores terapeutas profesionales' },
    { tipo:'seccion', t:'Creadores/as', s:'Red Tribu', u:'/red-tribu/?tab=creador', k:'facilitadores facilitadoras terapeutas profesores talleristas artistas musicos creador creadora' },
    { tipo:'seccion', t:'Comunidades', s:'Red Tribu', u:'/red-tribu/?tab=comunidad', k:'comunidad grupos colectivos' },
    { tipo:'seccion', t:'Experiencias', s:'Red Tribu', u:'/red-tribu/?tab=experiencia', k:'experiencias talleres retiros encuentros ceremonias eventos' },
    { tipo:'seccion', t:'Marcas', s:'Red Tribu', u:'/red-tribu/?tab=marca', k:'marcas emprendimientos productos tiendas' },
    { tipo:'seccion', t:'Lugares', s:'Red Tribu', u:'/red-tribu/?tab=lugar', k:'lugares espacios salas centros sedes' },
    { tipo:'seccion', t:'Club Tribu', s:'Sorteos, descuentos y beneficios', u:'/club-tribu-connection/', k:'club beneficios socios membresia' },
    { tipo:'seccion', t:'Beneficios del Club', s:'Club Tribu', u:'/club-tribu-connection/#beneficios', k:'sorteos descuentos whatsapp cumpleanos regalo beneficio' },
    { tipo:'seccion', t:'Marcas y espacios aliados', s:'Club Tribu', u:'/club-tribu-connection/#aliados', k:'aliados aliadas partners descuentos marcas' },
    { tipo:'seccion', t:'Sorteos del Club', s:'Club Tribu', u:'/club-tribu-connection/#sorteos', k:'sorteo sorteos entradas ganar' },
    { tipo:'seccion', t:'Sumá tu propuesta · Creás', s:'Para organizadores, facilitadores y prestadores de servicios', u:'/organizas-experiencias/', k:'creas organizo organizas difusion difundir mi evento visibilidad promocionar publicitar trabajar con tribu' },
    { tipo:'seccion', t:'Desafíos de quien organiza', s:'Creás', u:'/organizas-experiencias/#desafio', k:'desafio visible comunicar participacion' },
    { tipo:'seccion', t:'Proyectos reales en cada etapa', s:'Creás', u:'/organizas-experiencias/#casos', k:'casos historias proyectos ejemplos' },
    { tipo:'seccion', t:'¿Cómo podemos ayudarte?', s:'Creás', u:'/organizas-experiencias/#ayuda', k:'ayuda servicios como ayudan' },
    { tipo:'seccion', t:'Formas de trabajo para creadores', s:'Comunidad de Creadores · Servicios especiales · Packs', u:'/organizas-experiencias/#planes', k:'planes precios packs comunidad de creadores servicios especiales cobertura audiovisual entrevista sorteo carrusel plan de comunicacion continua cotizar' },
    { tipo:'seccion', t:'Preguntas frecuentes · Creás', s:'Creás', u:'/organizas-experiencias/#faq', k:'faq preguntas dudas' },
    { tipo:'seccion', t:'Sumá tu propuesta · Impulsás', s:'Para marcas y emprendimientos', u:'/representas-marca/', k:'impulsas marca empresa emprendimiento sponsor auspicio publicidad visibilidad' },
    { tipo:'seccion', t:'Historias de marcas', s:'Impulsás', u:'/representas-marca/#casos', k:'casos historias marcas' },
    { tipo:'seccion', t:'Formas de trabajo para marcas', s:'Packs y Plan de Comunicación Continua', u:'/representas-marca/#planes', k:'planes precios packs cotizar plan de comunicacion continua' },
    { tipo:'seccion', t:'Preguntas frecuentes · Impulsás', s:'Impulsás', u:'/representas-marca/#faq', k:'faq preguntas dudas' },
    { tipo:'seccion', t:'Auto-diagnóstico financiero de tu evento', s:'Herramienta gratuita', u:'/autodiagnostico-financiero-de-mi-evento/', k:'autodiagnostico finanzas costos presupuesto calculadora herramienta' },
    { tipo:'seccion', t:'Un Instante Eterno', s:'Ciclo de Encuentros · El Beso del Árbol', u:'/un-instante-eterno/', k:'instante eterno beso del arbol ciclo encuentros' },
    { tipo:'seccion', t:'Mi cuenta', s:'Ingresar o ver tu perfil', u:'/cuenta/', k:'cuenta ingresar login iniciar sesion entrar mi perfil' },
    { tipo:'seccion', t:'Publicar una experiencia', s:'Mi cuenta', u:'/cuenta/publicar/', k:'publicar experiencia cargar subir crear evento' },
    { tipo:'seccion', t:'Editar mi perfil', s:'Mi cuenta', u:'/cuenta/perfil/editar/', k:'editar perfil foto datos' },
    { tipo:'accion', t:'Sumate a la Tribu', s:'Creá tu cuenta gratis', act:'signup', k:'sumarme registrarme registro crear cuenta unirme' },
    { tipo:'accion', t:'Agregar mi evento a la agenda', s:'Agenda', u:'/agenda/#agregar-evento', k:'agregar cargar sumar publicar mi evento agenda' },
    { tipo:'accion', t:'Escribinos por WhatsApp', s:'Contacto', u:'https://wa.me/5491155031180', k:'contacto whatsapp hablar consultar telefono' },
    { tipo:'accion', t:'Política de privacidad', s:'Información legal', act:'legal:privacidad', k:'privacidad datos legal' },
    { tipo:'accion', t:'Política de cookies', s:'Información legal', act:'legal:cookies', k:'cookies legal' },
    { tipo:'accion', t:'Términos y condiciones', s:'Información legal', act:'legal:terminos', k:'terminos condiciones legal' },
    /* Marcas aliadas y lugares fijos de la Red Tribu */
    { tipo:'marca', t:'Bioferia Argentina', s:'Marca aliada · Club Tribu', u:rt('Bioferia', 'marca'), k:'feria organicos productos', img:'/assets/partners/bioferia.png?v=2' },
    { tipo:'marca', t:'Expo Holística & Bienestar', s:'Marca aliada · Club Tribu', u:rt('Expo Holística', 'marca'), k:'expo holistica bienestar terapias', img:'/assets/partners/expo-holistica.png?v=2' },
    { tipo:'marca', t:'Resonar Festival', s:'Marca aliada · Club Tribu', u:rt('Resonar', 'marca'), k:'festival musica consciente', img:'/assets/partners/resonar-festival.png?v=2' },
    { tipo:'marca', t:'Sagrada Madre', s:'Marca aliada · Club Tribu', u:rt('Sagrada Madre', 'marca'), k:'rituales naturaleza', img:'/assets/partners/sagrada-madre.png?v=2' },
    { tipo:'marca', t:'Unifungi', s:'Marca aliada · Club Tribu', u:rt('Unifungi', 'marca'), k:'hongos micologia' },
    { tipo:'marca', t:'Amanita Festival', s:'Marca aliada · Mercedes, Buenos Aires', u:rt('Amanita', 'marca'), k:'festival el portal mercedes' },
    { tipo:'lugar', t:'Espacio Om', s:'Lugar · Palermo, CABA', u:rt('Espacio Om', 'lugar'), k:'sala circulos sonido holistico palermo' },
    { tipo:'lugar', t:'Parque Centenario', s:'Lugar · CABA', u:rt('Parque Centenario', 'lugar'), k:'parque aire libre ferias' },
    /* Historias destacadas (abren el reel en Instagram) */
    { tipo:'historia', t:'Conciencia Festival · Michelle Gibson', s:'Entrevista · Instagram', u:'https://www.instagram.com/reel/DX-HV1RAk43/', k:'michelle gibson conciencia festival entrevista danza', img:'/assets/historias/conciencia-michelle-gibson.jpg?v=2' },
    { tipo:'historia', t:'Fiesta Clapper', s:'Sorteo de entradas · Instagram', u:'https://www.instagram.com/reel/DZYaexfgHE5/', k:'clapper fiesta sorteo', img:'/assets/historias/fiesta-clapper.jpg?v=2' },
    { tipo:'historia', t:'Meeting Point · Resonar Festival', s:'Cobertura · Instagram', u:'https://www.instagram.com/reel/DakrN-bg84K/', k:'meeting point resonar cobertura', img:'/assets/historias/meeting-point-resonar.jpg?v=2' },
    { tipo:'historia', t:'Vino, Tarot y Disfrute', s:'Experiencia · Instagram', u:'https://www.instagram.com/reel/DZ-8fJpASJ-/', k:'vino tarot disfrute', img:'/assets/historias/vino-tarot-disfrute.jpg?v=2' },
    { tipo:'historia', t:'Sagrada Madre', s:'Historia de marca · Instagram', u:'https://www.instagram.com/reel/Db5pnPMATSC/', k:'sagrada madre marca', img:'/assets/historias/sagrada-madre.jpg?v=2' },
    { tipo:'historia', t:'SkyddSpine', s:'Historia de marca · Instagram', u:'https://www.instagram.com/reel/DbrNLhuAjFJ/', k:'skydd spine skyddspine marca', img:'/assets/historias/skyddspine.jpg?v=2' },
    { tipo:'historia', t:'Unifungi', s:'Historia de marca · Instagram', u:'https://www.instagram.com/reel/DYXDEb9gNlJ/', k:'unifungi hongos marca', img:'/assets/historias/unifungi.jpg?v=3' },
    { tipo:'historia', t:'Hawka', s:'Historia de marca', u:'/representas-marca/#casos', k:'hawka marca', img:'/assets/historias/hawka.jpg?v=2' }
  ];

  /* ---- Índice: lo fijo + lo que llega después (Supabase, catálogo) ---- */
  let dinamicos = [];      // perfiles + experiencias publicadas
  let disciplinas = [];    // prácticas y ámbitos del catálogo de la Red Tribu
  let cargado = false;

  function eventos(){
    const slugFn = window.TRIBU_SLUG || norm;
    const rubros = window.TRIBU_RUBROS || {};
    const vistos = {}, out = [];
    const hoy = (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date());
    (window.TRIBU_EVENTS || []).filter(e => !e.date || e.date >= hoy).sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(e => {
      const slug = slugFn(e.title);
      if(vistos[slug]) return;
      vistos[slug] = 1;
      const d = new Date(e.date + 'T00:00');
      const fecha = isNaN(d) ? '' : d.getDate() + ' ' + MESES_ABR[d.getMonth()];
      out.push({ tipo:'evento', t:e.title, s:[fecha, e.place].filter(Boolean).join(' · '), u:'/agenda/evento/?id=' + encodeURIComponent(slug),
        k:[e.place, (rubros[e.rubro] || {}).label, e.rubro].join(' '), lugar:e.place });
    });
    return out;
  }

  /* Lugares: cada nombre de lugar que aparece en eventos, experiencias y perfiles.
     Si hay una sola cosa en ese lugar lleva directo a ella; si hay varias, a la
     Red Tribu filtrada por ese lugar. */
  function lugares(items){
    const mapa = {};
    items.forEach(it => {
      if(!it.lugar || it.tipo === 'lugar') return;
      String(it.lugar).split(/,|·|\(/).map(x => x.replace(/\)/g, '').trim()).filter(x => x.length > 2 && !/^online$/i.test(x) && !/\d/.test(x)).forEach(nombre => {
        const key = norm(nombre);
        const m = (mapa[key] = mapa[key] || { nombre, cosas:[] });
        if(!m.cosas.includes(it)) m.cosas.push(it);
      });
    });
    return Object.values(mapa).map(({ nombre, cosas }) => ({
      tipo:'lugar', t:nombre,
      s:cosas.length === 1 ? cosas[0].t : cosas.length + ' resultados en este lugar',
      u:cosas.length === 1 ? cosas[0].u : rt(nombre), k:'', peso:-4
    }));
  }

  function indice(){
    const base = [...FIJOS, ...eventos(), ...dinamicos];
    return [...base, ...lugares(base), ...disciplinas];
  }

  function refrescar(){
    document.querySelectorAll('.nav-search-input').forEach(i => {
      if(i === document.activeElement && i.value.trim()) i.dispatchEvent(new Event('input'));
    });
  }

  /* ---- Carga perezosa: Supabase + catálogo de disciplinas ---- */
  function cargarTodo(){
    if(cargado) return;
    cargado = true;

    if(typeof sb !== 'undefined'){
      Promise.all([
        sb.from('perfiles_publicos').select('nombre,nombre_marca,slug,tipo,roles,categorias,tipo_creador,categoria_principal,titulo_profesional,servicios,ciudad,foto_url').eq('publicado', true).eq('comparte_perfil', true),
        sb.from('experiences').select('id,nombre,tipo,fecha,lugar,ciudad_barrio,modalidad,categorias,organiza_nombre,proyecto_nombre,imagen_portada_url').eq('estado_publicacion', 'publicado')
      ]).then(([perfiles, experiencias]) => {
        const out = [];
        (perfiles.data || []).forEach(p => {
          if(!p.slug) return;
          const roles = p.roles || [];
          const crea = roles.some(r => /organiza|facilita|ofrece|colaborar/.test(r)) || (!roles.length && p.tipo !== 'marca');
          const tipo = crea ? 'persona' : roles.includes('tiene_marca') || p.tipo === 'marca' ? 'marca' : roles.includes('tiene_lugar') ? 'lugar' : roles.includes('tiene_comunidad') ? 'comunidad' : 'persona';
          const nombre = tipo === 'marca' ? (p.nombre_marca || p.nombre) : p.nombre;
          const que = (p.tipo_creador && p.tipo_creador.length ? p.tipo_creador.join(' · ') : '') || p.titulo_profesional || p.categoria_principal || (p.categorias || []).slice(0, 2).join(' · ');
          out.push({ tipo, t:nombre, s:[que, p.ciudad].filter(Boolean).join(' · '), u:'/' + encodeURIComponent(p.slug),
            k:[p.nombre, p.nombre_marca, p.categoria_principal, p.titulo_profesional, ...(p.categorias || []), ...(p.tipo_creador || []), ...(p.servicios || [])].join(' '),
            img:/^https:\/\//.test(p.foto_url || '') ? p.foto_url : '', lugar:p.ciudad, peso:8 });
        });
        const hoyX = new Date(); hoyX.setHours(0, 0, 0, 0);
        (experiencias.data || []).filter(e => !e.fecha || new Date(e.fecha + 'T00:00') >= hoyX).forEach(e => {
          const d = e.fecha ? new Date(e.fecha + 'T00:00') : null;
          const fecha = d && !isNaN(d) ? d.getDate() + ' ' + MESES_ABR[d.getMonth()] : '';
          const lugar = e.modalidad === 'Online' ? 'Online' : [e.lugar, e.ciudad_barrio].filter(Boolean).join(', ');
          out.push({ tipo:'experiencia', t:e.nombre, s:[e.tipo || 'Experiencia', fecha, lugar].filter(Boolean).join(' · '), u:'/experiencia/?id=' + encodeURIComponent(e.id),
            k:[e.tipo, e.organiza_nombre, e.proyecto_nombre, lugar, ...(e.categorias || [])].join(' '),
            img:/^https:\/\//.test(e.imagen_portada_url || '') ? e.imagen_portada_url : '', lugar, peso:6 });
        });
        dinamicos = out;
        refrescar();
      }).catch(() => {});
    }

    const armarDisciplinas = () => {
      if(typeof TRIBU_PRACTICAS === 'undefined') return;
      const ambito = {};
      (typeof TRIBU_AMBITOS !== 'undefined' ? TRIBU_AMBITOS : []).forEach(a => { ambito[a.id] = a.es; });
      disciplinas = [
        ...Object.values(ambito).map(es => ({ tipo:'disciplina', t:es, s:'Ámbito · ver en la Red Tribu', u:rt(es), k:'', peso:-8 })),
        ...TRIBU_PRACTICAS.map(p => ({ tipo:'disciplina', t:p.es, s:(ambito[p.ambitos[0]] || 'Disciplina') + ' · ver en la Red Tribu', u:rt(p.es.split(' / ')[0]), k:'', peso:-8 }))
      ];
      refrescar();
    };
    if(typeof TRIBU_PRACTICAS !== 'undefined') armarDisciplinas();
    else {
      const s = document.createElement('script');
      s.src = '/assets/red-tribu-filtros.js?v=1';
      s.onload = armarDisciplinas;
      document.head.appendChild(s);
    }
  }
  document.addEventListener('tribu:events-updated', refrescar);

  /* ---- Búsqueda: todas las palabras tienen que aparecer; pesa más el título ---- */
  const ORDEN_TIPO = { persona:6, marca:5, experiencia:5, evento:5, comunidad:4, lugar:3, seccion:2, historia:1, accion:0, disciplina:0 };
  function buscar(qRaw){
    const q = norm(qRaw);
    const palabras = q.split(' ').filter(Boolean);
    const res = [], vistos = new Set();
    indice().forEach(it => {
      const titulo = norm(it.t);
      const pajar = titulo + ' ' + norm(it.s) + ' ' + norm(it.k);
      if(!palabras.every(p => pajar.includes(p))) return;
      const clave = it.tipo + '|' + titulo + '|' + (it.u || it.act);
      if(vistos.has(clave)) return;
      vistos.add(clave);
      let score = titulo === q ? 120 : titulo.startsWith(q) ? 100 : (' ' + titulo).includes(' ' + q) ? 80 : titulo.includes(q) ? 60
        : palabras.every(p => titulo.includes(p)) ? 50 : norm(it.s).includes(q) ? 30 : 15;
      score += (ORDEN_TIPO[it.tipo] || 0) + (it.peso || 0);
      res.push({ it, score });
    });
    return res.sort((a, b) => b.score - a.score).slice(0, 12).map(r => r.it);
  }

  function filaHTML(it, i){
    const thumb = it.img
      ? '<span class="ns-thumb' + (it.img.includes('/partners/') ? ' ns-logo' : '') + '"><img src="' + esc(it.img) + '" alt="" loading="lazy"></span>'
      : '<span class="ns-thumb ns-ic ns-' + it.tipo + '"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">' + (IC[it.tipo] || IC.seccion) + '</svg></span>';
    const externo = /^https?:/.test(it.u || '');
    return '<a href="' + esc(it.u || '#') + '"' + (externo ? ' target="_blank" rel="noopener"' : '') + ' data-i="' + i + '" role="option">' + thumb +
      '<span class="ns-txt"><span class="ns-t">' + esc(it.t) + '</span>' + (it.s ? '<small>' + esc(it.s) + '</small>' : '') + '</span>' +
      '<span class="ns-tipo">' + esc(TIPO_LABEL[it.tipo] || '') + '</span></a>';
  }

  function ejecutar(it, e){
    if(!it || !it.act) return false;
    if(e) e.preventDefault();
    if(it.act === 'signup'){
      const b = document.querySelector('[data-signup]');
      if(b) b.click(); else location.href = '/cuenta/';
    } else if(it.act.startsWith('legal:') && document.getElementById('legalModal')){
      const a = document.createElement('a');
      a.dataset.legal = it.act.slice(6); a.hidden = true;
      document.body.appendChild(a); a.click(); a.remove();
    }
    return true;
  }

  /* ---- Cajas: la del nav (se agrega si la página no la trae) y, en celular,
     una arriba de todo en el menú ---- */
  const LUPA = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
  const cajaHTML = extra => '<label class="nav-search' + extra + '">' + LUPA +
    '<input type="search" placeholder="Buscar en Tribu" aria-label="Buscar en Tribu" class="nav-search-input">' +
    '<div class="nav-search-results" role="listbox"></div></label>';
  /* Solo donde está el estilo del buscador (home.css). */
  const conEstilo = !!document.querySelector('link[href*="home.css"]');
  const navCta = conEstilo && document.querySelector('.nav .nav-cta');
  if(navCta && !navCta.querySelector('.nav-search')) navCta.insertAdjacentHTML('afterbegin', cajaHTML(''));
  const menu = conEstilo && document.getElementById('mobileMenu');
  if(menu && !menu.querySelector('.nav-search')) menu.insertAdjacentHTML('afterbegin', cajaHTML(' nav-search--menu'));

  document.querySelectorAll('.nav-search').forEach(box => {
    const input = box.querySelector('.nav-search-input');
    const results = box.querySelector('.nav-search-results');
    if(!input || !results) return;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('enterkeyhint', 'search');
    let actuales = [], activo = -1;

    function marcarActivo(n){
      const filas = results.querySelectorAll('a[data-i]');
      if(!filas.length) return;
      activo = (n + filas.length) % filas.length;
      filas.forEach((f, i) => f.classList.toggle('is-active-result', i === activo));
      filas[activo].scrollIntoView({ block:'nearest' });
    }

    function render(){
      const q = input.value.trim();
      if(!q){ results.classList.remove('open'); results.innerHTML = ''; actuales = []; return; }
      actuales = buscar(q);
      activo = -1;
      const mas = '<a class="ns-mas" href="' + esc(rt(q)) + '">Buscar «' + esc(q) + '» en toda la Red Tribu →</a>';
      results.innerHTML = actuales.length
        ? actuales.map(filaHTML).join('') + mas
        : '<div class="nav-search-empty">Sin resultados para «' + esc(q) + '».<br>Probá con un nombre, una disciplina o un lugar.</div>' + mas;
      results.classList.add('open');
    }

    input.addEventListener('input', () => { cargarTodo(); render(); });
    input.addEventListener('focus', () => { cargarTodo(); if(input.value.trim()) render(); });
    input.addEventListener('pointerenter', cargarTodo, { once:true });
    input.addEventListener('keydown', e => {
      if(e.key === 'ArrowDown'){ e.preventDefault(); marcarActivo(activo + 1); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); marcarActivo(activo - 1); }
      else if(e.key === 'Enter'){
        e.preventDefault();
        const fila = results.querySelectorAll('a[data-i]')[activo < 0 ? 0 : activo] || results.querySelector('a.ns-mas');
        if(fila) fila.click();
      }
      else if(e.key === 'Escape'){ results.classList.remove('open'); input.blur(); }
    });
    results.addEventListener('click', e => {
      const a = e.target.closest('a');
      if(!a) return;
      results.classList.remove('open');
      /* Desde el menú del celular: se cierra, así se ve a dónde llegó (sobre
         todo con anclas de la misma página, que no recargan). */
      const m = document.getElementById('mobileMenu');
      if(m && m.contains(box) && m.classList.contains('open')) document.getElementById('burger')?.click();
      if(a.dataset.i != null) ejecutar(actuales[+a.dataset.i], e);
    });
    document.addEventListener('click', e => { if(!box.contains(e.target)) results.classList.remove('open'); });
  });

  /* Atajo: "/" lleva al buscador (si no se está escribiendo en otro campo). */
  document.addEventListener('keydown', e => {
    if(e.key !== '/' || /^(input|textarea|select)$/i.test(e.target.tagName || '') || e.target.isContentEditable) return;
    const i = document.querySelector('.nav .nav-search-input');
    if(i && i.offsetParent){ e.preventDefault(); i.focus(); }
  });
})();

/* ============ "ESTE FINDE EN TRIBU" (home) ============ */
(function(){
  const row = document.getElementById('homeAgendaRow');
  if(!row) return;
  const RUBROS = window.TRIBU_RUBROS || {};
  const slug = window.TRIBU_SLUG || (s => String(s));
  const MES_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const today = new Date(); today.setHours(0,0,0,0);

  function pintar(){
    const EVENTS = window.TRIBU_EVENTS || [];
    const grupos = {};
    EVENTS.forEach(e=>{
      const g = grupos[e.title];
      if(!g) grupos[e.title] = { start:e.date, end:e.date, ev:e };
      else { if(e.date < g.start) g.start = e.date; if(e.date > g.end) g.end = e.date; }
    });
    const proximos = Object.values(grupos)
      .filter(g => new Date(g.end+'T00:00') >= today)
      .sort((a,b) => a.start.localeCompare(b.start))
      .slice(0, 4);

    const section = row.closest('section');
    if(!proximos.length){
      if(section) section.style.display = 'none';
      return;
    }
    if(section) section.style.display = '';

    row.innerHTML = proximos.map(g => {
      const e = g.ev;
      const rubro = RUBROS[e.rubro] || { label: e.rubro, color: '#8A8D98' };
      const d = new Date(g.start+'T00:00');
      const dEnd = new Date(g.end+'T00:00');
      const multi = g.start !== g.end;
      /* Sin clase "reveal": se agregan al DOM después de que el observer de
         animaciones de entrada ya corrió, así que quedarían en opacity:0 para
         siempre si dependieran de esa clase. */
      return '<a class="ev-card" href="/agenda/evento/?id='+encodeURIComponent(slug(e.title))+'">'+
        '<div class="ev-card-media" style="background-image:url('+window.TRIBU_FOTO_EVENTO(e)+')">'+
          '<span class="ev-card-date">'+(multi
            ? '<b class="ev-date-range">'+d.getDate()+'<i>al</i>'+dEnd.getDate()+'</b>'
            : '<b>'+d.getDate()+'</b>')+'<span>'+MES_ABR[d.getMonth()]+'</span></span>'+
          '<span class="ev-card-cat" style="background:'+rubro.color+'">'+esc(rubro.label)+'</span>'+
        '</div>'+
        '<div class="ev-card-body">'+
          '<h3>'+esc(e.title)+'</h3>'+
          '<p class="ev-card-loc">📍 '+esc(e.place||'')+'</p>'+
        '</div>'+
      '</a>';
    }).join('');
  }
  pintar();
  document.addEventListener('tribu:events-updated', pintar);
})();

/* ============ SELECTS NATIVOS -> DESPLEGABLES REDONDEADOS (estética .cselect) ============
   Reemplaza visualmente cualquier <select> del sitio por el mismo widget ya usado en
   "rubroSel" (botón + lista propia), porque el popup nativo de un <select> no se puede
   redondear en la mayoría de los navegadores. El <select> original queda oculto dentro
   del widget y sigue siendo la fuente de verdad (value, name, disabled, eventos "change"),
   así el resto del código de cada página no necesita cambiar. Excluye cdate-month-sel /
   cdate-year-sel: son selects muy chicos ya embebidos en un popup de fecha propio, y
   anidar otro popup ahí adentro rompe ese calendario compacto. */
(function(){
  function build(select){
    if(select.dataset.cselectReady) return;
    select.dataset.cselectReady = '1';

    const wrap = document.createElement('div');
    wrap.className = 'cselect';
    select.parentNode.insertBefore(wrap, select);

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'cselect-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    const val = document.createElement('span'); val.className = 'cselect-val';
    btn.appendChild(val);
    btn.insertAdjacentHTML('beforeend', '<svg class="cselect-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>');

    const list = document.createElement('div'); list.className = 'cselect-list'; list.setAttribute('role', 'listbox');

    wrap.appendChild(btn); wrap.appendChild(list); wrap.appendChild(select);

    function paint(){
      const opt = select.options[select.selectedIndex];
      val.textContent = opt ? opt.textContent : '';
      val.classList.toggle('is-ph', !select.value);
      list.querySelectorAll('button').forEach(o => o.classList.toggle('sel', o.dataset.val === select.value));
      wrap.classList.toggle('cselect-disabled', select.disabled);
    }
    function refresh(){
      list.innerHTML = '';
      Array.from(select.options).forEach(opt => {
        const o = document.createElement('button');
        o.type = 'button'; o.dataset.val = opt.value; o.textContent = opt.textContent;
        o.addEventListener('click', () => {
          if(select.disabled) return;
          if(select.value !== opt.value){ select.value = opt.value; select.dispatchEvent(new Event('change', { bubbles: true })); }
          wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
          paint();
        });
        list.appendChild(o);
      });
      paint();
    }

    btn.addEventListener('click', e => {
      e.stopPropagation();
      if(select.disabled) return;
      const willOpen = !wrap.classList.contains('open');
      document.querySelectorAll('.cselect.open').forEach(o => { if(o !== wrap) o.classList.remove('open'); });
      wrap.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });

    refresh();
    /* La opción de ciudad se reconstruye por completo cuando cambia la provincia
       (ciudadSel.innerHTML = ...), y categoriaPrincipal se llena después de este script.
       El observer detecta esos cambios de <option> y de "disabled" sin que cada página
       tenga que avisarle a este widget. */
    new MutationObserver(refresh).observe(select, { childList: true });
    new MutationObserver(paint).observe(select, { attributes: true, attributeFilter: ['disabled'] });
  }

  document.addEventListener('click', () => document.querySelectorAll('.cselect.open').forEach(o => o.classList.remove('open')));
  document.addEventListener('keydown', e => { if(e.key === 'Escape') document.querySelectorAll('.cselect.open').forEach(o => o.classList.remove('open')); });

  function enhanceAll(root){
    (root || document).querySelectorAll('select:not(.cdate-month-sel):not(.cdate-year-sel)').forEach(build);
  }
  document.addEventListener('DOMContentLoaded', () => enhanceAll());
  window.tribuEnhanceSelects = enhanceAll;
})();

/* ============ FAQ EN DOS COLUMNAS: UNA PREGUNTA, UN RENGLÓN ============
   En desktop ancho las preguntas van en un solo renglón. Si con la letra
   normal las dos columnas no entran, se achica de a poco (hasta un mínimo
   legible); si ni así entran, se deja partir la línea. */
(function(){
  const listas = document.querySelectorAll(".faq--2col");
  if(!listas.length) return;
  function ajustar(){
    listas.forEach(l => {
      l.classList.remove("parte"); l.style.removeProperty("--faq-fs");
      if(window.innerWidth < 1200) return;
      const desborda = () => l.scrollWidth > l.clientWidth + 1 || [...l.querySelectorAll("summary")].some(s => s.scrollWidth > s.clientWidth + 1);
      let fs = 0.98;
      while(desborda() && fs > 0.8){ fs = Math.round((fs - 0.02) * 100) / 100; l.style.setProperty("--faq-fs", fs + "rem"); }
      if(desborda()) l.classList.add("parte");
    });
  }
  let t = null;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(ajustar, 120); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar); else ajustar();
  ajustar();
})();
