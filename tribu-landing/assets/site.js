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

/* Capa de mapa compartida: Esri "Dark Gray Canvas" (gratis, sin API key), con la
   estética oscura de Tribu. CARTO dejó de servir sus tiles gratis sin key en 2026,
   por eso el cambio — Esri no pide key y su tope de zoom (16) alcanza para lo que
   usamos acá (barrio/ciudad, nunca calle a calle). */
function tribuDarkTiles(){
  const base = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  });
  const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  });
  return L.layerGroup([base, labels]);
}

/* Nav: fondo al scrollear */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
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
burger.addEventListener('click', () => toggleMenu(!menu.classList.contains('open')));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
/* Cerrar el menú suavemente si se scrollea la página detrás */
window.addEventListener('scroll', () => {
  if(menu.classList.contains('open') && Math.abs(window.scrollY - menuOpenScrollY) > 4){
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
  const evByDate = ds => EVENTS.filter(e => e.date===ds && pass(e)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));

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
  function initMap(){
    if(calMap) return;
    calMap = L.map('calMap', { scrollWheelZoom:true }).setView([-38.4, -63.6], 4);
    tribuDarkTiles().addTo(calMap);
    renderMap();
  }
  const viewToggle = document.getElementById('calViewToggle');
  const viewList = document.getElementById('calViewList');
  const viewMap = document.getElementById('calViewMap');
  if(viewToggle){
    viewToggle.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        viewToggle.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const isMap = btn.dataset.view === 'map';
        viewList.style.display = isMap ? 'none' : '';
        viewMap.style.display = isMap ? '' : 'none';
        if(isMap){ initMap(); setTimeout(()=>{ calMap.invalidateSize(); renderMap(); }, 60); }
      });
    });
  }

  function evCard(e){
    const d = new Date(e.date+'T00:00');
    const href = ' href="/agenda/evento/?id='+encodeURIComponent(slugEvent(e.title))+'"';
    const st = e.status==='Pendiente' ? '<span class="ev-status st-pend">Pendiente</span>'
            : (e.status ? '<span class="ev-status st-conf">Confirmado</span>' : '');
    return '<a class="ev"'+href+'>'+
      '<div class="ev-date"><b>'+d.getDate()+'</b><span>'+MES_ABR[d.getMonth()]+'</span></div>'+
      '<div class="ev-body">'+
        '<div class="ev-head"><span class="ev-cat"><i style="background:'+color(e.rubro)+'"></i>'+esc((RUBROS[e.rubro]||{}).label||e.rubro)+'</span>'+st+'</div>'+
        '<div class="ev-title">'+esc(e.title)+'</div>'+
        '<div class="ev-meta">'+ (e.time?esc(e.time)+' · ':'') + '<span class="ev-loc">📍 '+esc(e.place||'')+'</span></div>'+
      '</div></a>';
  }

  function renderList(dateStr, heading){
    let evs, title;
    if(dateStr){ evs = evByDate(dateStr); title = heading; }
    else { evs = EVENTS.filter(e=> pass(e) && new Date(e.date+'T00:00') >= today).sort((a,b)=>a.date.localeCompare(b.date)); title='Próxima agenda'; }
    if(agendaTitle) agendaTitle.firstChild.textContent = title+' ';
    countEl.textContent = evs.length ? evs.length+(evs.length===1?' evento':' eventos') : '';
    if(!evs.length){ listEl.innerHTML = '<p class="cal-empty">No hay eventos'+(dateStr?' para este día':'')+'. Probá con otro filtro o mes.</p>'; return; }
    listEl.innerHTML = evs.map(evCard).join('');
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
  }
  document.getElementById('calPrev').addEventListener('click', ()=>{ view.setMonth(view.getMonth()-1); render(); });
  document.getElementById('calNext').addEventListener('click', ()=>{ view.setMonth(view.getMonth()+1); render(); });
  document.getElementById('calToday').addEventListener('click', ()=>{ view=new Date(today.getFullYear(),today.getMonth(),1); selected=null; render(); renderList(); });
  renderFilters(); render(); renderList();
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
    setTimeout(()=>{
      if(!geoMap){
        geoMap = L.map('evLocMap', { zoomControl:false, attributionControl:false, scrollWheelZoom:false }).setView([lat,lng], 13);
        tribuDarkTiles().addTo(geoMap);
      }
      geoMap.invalidateSize();
      geoMap.setView([lat,lng], 14);
      if(geoMarker) geoMap.removeLayer(geoMarker);
      geoMarker = L.marker([lat,lng]).addTo(geoMap);
      if(label) geoMarker.bindPopup(escHtml(label));
    }, 50);
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
  const openPickers = [cs, dp, bp].filter(Boolean);
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
  document.querySelectorAll('[data-legal]').forEach(link=>{
    link.addEventListener('click', (e)=>{ e.preventDefault(); openLegal(link.dataset.legal); });
  });
  tabs.forEach(t=> t.addEventListener('click', ()=> openLegal(t.dataset.tab)));
  legalClose.addEventListener('click', closeLegal);
  legalOverlay.addEventListener('click', e=>{ if(e.target===legalOverlay) closeLegal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && legalOverlay.classList.contains('open')) closeLegal(); });
})();

/* ============ BUSCADOR (nav) ============ */
(function(){
  const boxes = document.querySelectorAll('.nav-search');
  if(!boxes.length) return;

  /* Páginas fijas del sitio: siempre entran en los resultados si el texto matchea. */
  const PAGES = [
    { title:'Inicio', sub:'Home', url:'/' },
    { title:'Agenda', sub:'Calendario de eventos', url:'/agenda/' },
    { title:'Red Tribu', sub:'Creadores, marcas y lugares', url:'/red-tribu/' },
    { title:'Historias que inspiran', sub:'Entrevistas y reels', url:'/#historias' },
    { title:'Club Tribu', sub:'Sorteos, descuentos y beneficios', url:'/club-tribu-connection/' },
  ];

  const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const MESES_ABR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  function eventResults(q){
    const events = window.TRIBU_EVENTS || [];
    const slugFn = window.TRIBU_SLUG || (s=>norm(s));
    const seen = new Set();
    const out = [];
    events.forEach(e=>{
      const slug = slugFn(e.title);
      if(seen.has(slug)) return;
      if(!norm(e.title).includes(q) && !norm(e.place).includes(q)) return;
      seen.add(slug);
      const d = new Date(e.date+'T00:00');
      out.push({
        title: e.title,
        sub: d.getDate()+' '+MESES_ABR[d.getMonth()]+' · '+(e.place||'Agenda'),
        url: '/agenda/evento/?id='+encodeURIComponent(slug)
      });
    });
    return out.slice(0,5);
  }

  function pageResults(q){
    return PAGES.filter(p => norm(p.title).includes(q) || norm(p.sub).includes(q));
  }

  boxes.forEach(box=>{
    const input = box.querySelector('.nav-search-input');
    const results = box.querySelector('.nav-search-results');
    if(!input || !results) return;

    function render(q){
      const items = [...pageResults(q), ...eventResults(q)];
      if(!items.length){
        results.innerHTML = '<div class="nav-search-empty">Sin resultados para "'+esc(q)+'"</div>';
        results.classList.add('open');
        return;
      }
      results.innerHTML = items.map(it=>
        '<a href="'+esc(it.url)+'">'+esc(it.title)+'<small>'+esc(it.sub)+'</small></a>'
      ).join('');
      results.classList.add('open');
    }

    input.addEventListener('input', ()=>{
      const q = norm(input.value.trim());
      if(!q){ results.classList.remove('open'); results.innerHTML=''; return; }
      render(q);
    });
    input.addEventListener('focus', ()=>{ if(input.value.trim()) render(norm(input.value.trim())); });
    input.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        const first = results.querySelector('a');
        if(first) window.location.href = first.getAttribute('href');
      }
      if(e.key==='Escape'){ results.classList.remove('open'); input.blur(); }
    });
    document.addEventListener('click', e=>{
      if(!box.contains(e.target)) results.classList.remove('open');
    });
  });
})();
