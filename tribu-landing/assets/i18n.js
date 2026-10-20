/* ============================================================
   TRIBU CONNECTION — Idiomas (ES / EN / PT)

   El sitio se escribe en español y se traduce al vuelo:
   - Este archivo va en el <head> de cada página, ANTES que todo lo demás.
     Si el idioma elegido no es español, carga el diccionario de ese idioma
     (/assets/i18n/en.js o pt.js) de forma sincrónica y traduce cada nodo
     a medida que el navegador arma la página: no se ve el español ni un
     instante, y lo que se agrega después por JS (modales, buscador, filtros,
     el chat) se traduce solo gracias a un MutationObserver.
   - Las claves del diccionario son el texto en español, con los espacios
     colapsados. Un párrafo con negritas o links se traduce entero (clave con
     las etiquetas sin atributos: "Hola <b>Tribu</b>"), así la traducción
     puede reordenar la frase; los elementos originales (con sus links y
     eventos) se conservan y solo cambian sus textos.
   - Números y fechas se generalizan: "3 eventos" busca "{0} eventos" y
     "24 de octubre" busca "{0} de {m0}". Un dato variable (un nombre) va
     como {*}: "Conectar con {*}".
   - Lo que escribe cada persona (perfiles, experiencias) no está en el
     diccionario y queda como lo escribió.
   - window.TRIBU_I18N.variantes(texto) pasa una búsqueda escrita en inglés o
     portugués a sus equivalentes en español (glosario), para que el
     buscador, la Red Tribu y el chat entiendan los tres idiomas.
   - Los diccionarios se generan con tools/i18n/build.js. Si cambian, subir
     VERSION_DIC (y la ?v= de este archivo en las páginas).
   ============================================================ */
(function(){
  'use strict';
  const IDIOMAS = { es:'Español', en:'English', pt:'Português' };
  const VERSION_DIC = '2';

  /* ---------- Idioma elegido ---------- */
  function leerIdioma(){
    try{
      const q = new URLSearchParams(location.search).get('lang');
      if(q && IDIOMAS[q]){ localStorage.setItem('tribu_lang', q); return q; }
      const g = localStorage.getItem('tribu_lang');
      if(g && IDIOMAS[g]) return g;
    }catch(e){}
    /* Primera visita: si el navegador está en inglés o portugués, arranca así. */
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'es';
    const base = String(nav).slice(0, 2).toLowerCase();
    return base === 'en' || base === 'pt' ? base : 'es';
  }
  const coleccionar = /[?&]i18n=collect\b/.test(location.search);
  const lang = coleccionar ? 'es' : leerIdioma();
  document.documentElement.lang = lang === 'es' ? 'es-AR' : lang === 'pt' ? 'pt-BR' : 'en';
  document.documentElement.setAttribute('data-lang', lang);

  const API = window.TRIBU_I18N = {
    lang, idiomas: IDIOMAS,
    t: s => s,                 // traducir un texto suelto (desde JS)
    variantes: q => [q],       // búsqueda en otro idioma -> español
    cargarGlosario: () => Promise.resolve(),
    elegir(l){ try{ localStorage.setItem('tribu_lang', l); }catch(e){} const u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.toString()); }
  };

  /* ---------- Normalización y claves ---------- */
  const colapsar = s => String(s).replace(/\s+/g, ' ').trim();
  const LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/;
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const MESES_ABR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const DIAS_ABR = ['dom','lun','mar','mié','jue','vie','sáb'];
  const MES_TRAD = {
    en:{ full:['January','February','March','April','May','June','July','August','September','October','November','December'], abr:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
         dias:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], dabr:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] },
    pt:{ full:['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'], abr:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],
         dias:['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'], dabr:['dom','seg','ter','qua','qui','sex','sáb'] }
  };
  /* "3 eventos" -> "{0} eventos" (y guarda los números para devolverlos). */
  function generalizarNumeros(k){
    const nums = [];
    const g = k.replace(/\d+(?:[.,]\d+)*/g, m => { nums.push(m); return '{' + (nums.length - 1) + '}'; });
    return { g, nums };
  }
  /* "{0} de octubre" -> "{0} de {m0}" (solo se usa si hay números: es una fecha) */
  const RX_MES = new RegExp('(^|[^A-Za-zÁÉÍÓÚáéíóúñÑ])(' + MESES.concat(MESES_ABR, DIAS, DIAS_ABR).join('|') + ')(?![A-Za-zÁÉÍÓÚáéíóúñÑ])', 'gi');
  function generalizarFechas(k){
    const fechas = [];
    const g = k.replace(RX_MES, (m, pre, w) => { fechas.push(w); return pre + '{m' + (fechas.length - 1) + '}'; });
    return { g, fechas };
  }
  function fechaA(palabra){
    const T = MES_TRAD[lang]; if(!T) return palabra;
    const p = palabra.toLowerCase();
    let out = palabra, i;
    if((i = MESES.indexOf(p)) > -1) out = T.full[i];
    else if((i = MESES_ABR.indexOf(p)) > -1) out = T.abr[i];
    else if((i = DIAS.indexOf(p)) > -1) out = T.dias[i];
    else if((i = DIAS_ABR.indexOf(p)) > -1) out = T.dabr[i];
    if(palabra === palabra.toUpperCase() && palabra.length > 1) return out.toUpperCase();
    if(palabra[0] === palabra[0].toUpperCase()) return out[0].toUpperCase() + out.slice(1);
    return lang === 'en' ? out : out.toLowerCase();
  }

  /* ---------- Diccionario ---------- */
  let DIC = null, PATRONES = [];
  const escRx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /* Claves con {*} (un nombre u otro dato variable): 'Conectar con {*}'.
     Se guarda el comienzo fijo de cada una para descartar rápido. */
  function armarPatrones(){
    PATRONES = Object.keys(DIC).filter(k => k.includes('{*}')).map(k => {
      const partes = k.split('{*}');
      return [new RegExp('^' + partes.map(escRx).join('(.+?)') + '$'), DIC[k], partes[0]];
    });
  }
  /* Caché de búsquedas (también de lo que no tiene traducción: nombres,
     lugares, textos de cada perfil), así no se repite el trabajo. */
  const CACHE = new Map();
  function buscar(clave){
    if(!DIC || !clave) return null;
    const v = DIC[clave];
    if(v != null) return v;
    if(CACHE.has(clave)) return CACHE.get(clave);
    const r = buscarGeneral(clave);
    if(CACHE.size > 5000) CACHE.clear();
    CACHE.set(clave, r);
    return r;
  }
  function buscarGeneral(clave){
    let v;
    if(/\d/.test(clave)){
      const { g, nums } = generalizarNumeros(clave);
      v = DIC[g];
      if(v == null){
        const f = generalizarFechas(g);
        if(f.fechas.length && (v = DIC[f.g]) != null) v = v.replace(/\{m(\d+)\}/g, (m, i) => fechaA(f.fechas[+i] || ''));
      }
      if(v != null) return v.replace(/\{(\d+)\}/g, (m, i) => nums[+i] != null ? nums[+i] : m);
    }
    for(const [rx, tr, ini] of PATRONES){
      if(ini && !clave.startsWith(ini)) continue;
      const m = clave.match(rx);
      if(m){ let i = 1; return tr.replace(/\{\*\}/g, () => m[i++] || ''); }
    }
    return null;
  }
  API.t = s => { if(lang === 'es' || s == null) return s; const k = colapsar(s); const v = buscar(k); return v == null ? s : v; };

  /* ---------- Recorrido del DOM ---------- */
  const SALTAR = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE','svg','SVG','TEMPLATE','IFRAME','CANVAS','VIDEO','AUDIO']);
  const EN_LINEA = new Set(['A','ABBR','B','BR','CITE','EM','I','MARK','Q','S','SMALL','SPAN','STRONG','SUB','SUP','U','TIME','WBR']);
  const ATRIBUTOS = ['placeholder','aria-label','title','alt','data-placeholder'];
  const yaPuesto = new WeakMap();   // nodo -> texto que pusimos (para no traducir dos veces)

  function saltar(el){
    return SALTAR.has(el.nodeName) || el.isContentEditable || el.hasAttribute('data-no-traducir') || el.getAttribute('translate') === 'no' || el.classList.contains('notranslate');
  }
  /* ¿Es un bloque de texto con formato en línea (todo el contenido es texto o
     etiquetas en línea, con texto propio)? */
  function soloEnLinea(el){
    for(const n of el.childNodes){
      if(n.nodeType === 1){ if(!EN_LINEA.has(n.nodeName) || n.hasAttribute('data-no-traducir') || !soloEnLinea(n)) return false; }
      else if(n.nodeType !== 3 && n.nodeType !== 8) return false;
    }
    return true;
  }
  function esBloque(el){
    if(!el.firstElementChild || !soloEnLinea(el)) return false;
    for(const n of el.childNodes) if(n.nodeType === 3 && LETRA.test(n.data)) return true;
    return false;
  }
  function canonico(el){
    let s = '';
    for(const n of el.childNodes){
      if(n.nodeType === 3) s += n.data;
      else if(n.nodeType === 1){
        const t = n.nodeName.toLowerCase();
        s += t === 'br' || t === 'wbr' ? '<' + t + '>' : '<' + t + '>' + canonico(n) + '</' + t + '>';
      }
    }
    return s.replace(/\s+/g, ' ');
  }
  /* Aplica la traducción de un bloque conservando los elementos originales. */
  function aplicarPlantilla(orig, tpl){
    const oEls = [...orig.children], tEls = [...tpl.children];
    const mismas = oEls.length === tEls.length && oEls.every((e, i) => e.nodeName === tEls[i].nodeName);
    if(!mismas){ orig.innerHTML = tpl.innerHTML; return; }
    const nuevos = [];
    let k = 0;
    for(const n of [...tpl.childNodes]){
      if(n.nodeType === 3) nuevos.push(document.createTextNode(n.data));
      else if(n.nodeType === 1){ const o = oEls[k++]; if(!/^(BR|WBR)$/.test(o.nodeName)) aplicarPlantilla(o, n); nuevos.push(o); }
    }
    orig.replaceChildren(...nuevos);
  }

  const vistos = new Set();    // modo colección
  function anotar(k){ if(k && LETRA.test(k) && k.length < 4000) vistos.add(k); }

  function textoNodo(n){
    const d = n.data;
    if(!LETRA.test(d) || yaPuesto.get(n) === d) return;
    const k = colapsar(d);
    if(coleccionar){ anotar(k); return; }
    const v = buscar(k);
    if(v == null || v === k) return;
    const ini = d.match(/^\s*/)[0], fin = d.match(/\s*$/)[0];
    const nuevo = ini + v + fin;
    yaPuesto.set(n, nuevo);
    n.data = nuevo;
  }
  function atributos(el){
    for(const a of ATRIBUTOS){
      const val = el.getAttribute(a);
      if(!val || !LETRA.test(val) || yaPuesto.get(el) === a + val) continue;
      const k = colapsar(val);
      if(coleccionar){ anotar(k); continue; }
      const v = buscar(k);
      if(v != null && v !== k){ yaPuesto.set(el, a + v); el.setAttribute(a, v); }
    }
    if(el.nodeName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value && LETRA.test(el.value)){
      const k = colapsar(el.value);
      if(coleccionar) anotar(k);
      else { const v = buscar(k); if(v != null) el.value = v; }
    }
  }
  function recorrer(raiz){
    if(raiz.nodeType === 3){ if(raiz.parentElement && !dentroDeSalto(raiz.parentElement)) textoNodo(raiz); return; }
    if(raiz.nodeType !== 1) return;
    if(raiz.nodeName === 'TEXTAREA'){ atributos(raiz); return; }   // su placeholder sí, lo escrito no
    if(saltar(raiz)) return;
    atributos(raiz);
    if(raiz.nodeName === 'SELECT'){ for(const o of raiz.options) recorrer(o); return; }
    /* Una opción sin value manda su texto: se fija en español antes de
       traducirla, así los formularios y la lógica siguen recibiendo lo mismo. */
    if(raiz.nodeName === 'OPTION' && !coleccionar && !raiz.hasAttribute('value')) raiz.setAttribute('value', raiz.textContent);
    if(esBloque(raiz)){
      const k = colapsar(canonico(raiz));
      if(coleccionar){ anotar(k); return; }
      if(yaPuesto.get(raiz) === k) return;
      const v = buscar(k);
      if(v != null){
        const tpl = document.createElement('div'); tpl.innerHTML = v;
        aplicarPlantilla(raiz, tpl);
        yaPuesto.set(raiz, colapsar(canonico(raiz)));
        const marcar = el => { for(const n of el.childNodes){ if(n.nodeType === 3) yaPuesto.set(n, n.data); else if(n.nodeType === 1) marcar(n); } };
        marcar(raiz);
        return;
      }
    }
    for(const n of [...raiz.childNodes]){
      if(n.nodeType === 3) textoNodo(n);
      else if(n.nodeType === 1) recorrer(n);
    }
  }
  function dentroDeSalto(el){
    for(let e = el; e && e !== document.documentElement; e = e.parentElement) if(saltar(e)) return true;
    return false;
  }
  function traducirTitulo(){
    if(coleccionar){ anotar(colapsar(document.title)); return; }
    const v = buscar(colapsar(document.title));
    if(v != null && v !== document.title) document.title = v;
  }

  /* ---------- Arranque ---------- */
  function observar(){
    const obs = new MutationObserver(recs => {
      for(const r of recs){
        if(r.type === 'childList'){
          if(r.target.nodeName === 'TITLE'){ traducirTitulo(); continue; }
          if(r.target.nodeType === 1 && !dentroDeSalto(r.target) && esBloque(r.target)){ recorrer(r.target); continue; }
          r.addedNodes.forEach(n => { if(n.nodeType === 1 || n.nodeType === 3) recorrer(n); });
        } else if(r.type === 'characterData'){
          const p = r.target.parentElement;
          if(p && !dentroDeSalto(p)){ if(esBloque(p)) recorrer(p); else textoNodo(r.target); }
        } else if(r.type === 'attributes' && r.target.nodeType === 1 && !dentroDeSalto(r.target.nodeName === 'TEXTAREA' ? r.target.parentElement : r.target)){
          atributos(r.target);
        }
      }
    });
    obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:ATRIBUTOS.concat(['value']) });
    /* El observer arranca en el <head>, así que ve cada nodo que arma el
       navegador: no hace falta otra pasada completa al terminar de cargar. */
    if(document.body) recorrer(document.body);
    traducirTitulo();
    document.addEventListener('DOMContentLoaded', traducirTitulo);
  }

  if(coleccionar){
    window.__i18n = { vistos, recorrer, canonico, colapsar, esBloque, soloEnLinea, saltar };
    observar();
  } else if(lang !== 'es'){
    /* El diccionario se carga sincrónico: tiene que estar antes del <body>. */
    window.__tribuI18nListo = () => {
      DIC = window.TRIBU_DIC || {};
      armarPatrones();
      /* Alertas y confirmaciones que arman los scripts del sitio. */
      const a = window.alert.bind(window), c = window.confirm.bind(window), p = window.prompt.bind(window);
      window.alert = m => a(API.t(m));
      window.confirm = m => c(API.t(m));
      window.prompt = (m, d) => p(API.t(m), d);
      observar();
    };
    document.write('<script src="/assets/i18n/' + lang + '.js?v=' + VERSION_DIC + '"><\/script>');
  }

  /* ---------- Búsqueda en cualquiera de los tres idiomas ---------- */
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  let glosario = null, cargando = null;
  API.cargarGlosario = () => {
    if(glosario) return Promise.resolve();
    if(cargando) return cargando;
    cargando = new Promise(res => {
      const s = document.createElement('script');
      s.src = '/assets/i18n/glosario.js?v=' + VERSION_DIC;
      s.onload = () => {
        /* [[español, [inglés...], [portugués...]], ...] -> pares (término
           extranjero, español), los más largos primero para que "live music"
           gane sobre "music". */
        const pares = [];
        (window.TRIBU_GLOSARIO || []).forEach(([es, en, pt]) => {
          const e = norm(es);
          [].concat(en || [], pt || []).forEach(x => { const n = norm(x); if(n && n !== e) pares.push([n, e]); });
        });
        pares.sort((a, b) => b[0].length - a[0].length);
        glosario = pares;
        res();
      };
      s.onerror = () => { glosario = []; res(); };
      document.head.appendChild(s);
    });
    return cargando;
  };
  /* Devuelve la búsqueda normalizada + su versión con los términos en inglés o
     portugués pasados al español (también la última palabra a medio escribir). */
  API.variantes = q => {
    const base = norm(q);
    const out = [base];
    if(!glosario || !base) return out;
    let v = ' ' + base + ' ';
    for(const [ext, es] of glosario){
      if(v.includes(' ' + ext + ' ')) v = v.split(' ' + ext + ' ').join(' ' + es + ' ');
    }
    v = v.trim();
    if(v !== base) out.push(v);
    const ult = base.split(' ').pop();
    if(ult.length >= 3){
      const hit = glosario.find(([ext]) => ext.startsWith(ult) && !ext.includes(' '));
      if(hit){ const w = (v.slice(0, v.length - ult.length) + hit[1]).trim(); if(!out.includes(w)) out.push(w); }
    }
    return out;
  };

  /* ---------- Selector de idioma (círculo arriba a la derecha) ---------- */
  function selector(){
    if(document.querySelector('.lang-sel')) return;
    const st = document.createElement('style');
    st.textContent =
      '.lang-sel{position:relative;flex:none;z-index:70}' +
      '.lang-sel>button{width:40px;height:40px;border-radius:50%;border:1px solid rgba(244,241,234,.28);background:rgba(255,255,255,.05);color:#F4F1EA;font:700 .72rem/1 Poppins,system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;display:grid;place-items:center;transition:.2s;padding:0;position:relative;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
      '.lang-sel>button:hover,.lang-sel.open>button{border-color:#F4F1EA;background:rgba(255,255,255,.1)}' +
      '.lang-sel ul{position:absolute;top:calc(100% + 8px);right:0;list-style:none;margin:0;padding:.35rem;background:#16181f;border:1px solid rgba(244,241,234,.16);border-radius:14px;box-shadow:0 18px 40px -14px rgba(0,0,0,.7);display:none;min-width:150px}' +
      '.lang-sel.open ul{display:block}' +
      '.lang-sel li button{width:100%;display:flex;align-items:center;gap:.6rem;background:none;border:0;color:#F4F1EA;font:500 .86rem/1.2 Poppins,system-ui,sans-serif;padding:.7rem .75rem;border-radius:9px;cursor:pointer;text-align:left;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
      '.lang-sel li button b{font-weight:700;font-size:.72rem;letter-spacing:.06em;width:22px;opacity:.75}' +
      '.lang-sel li button:hover{background:rgba(255,255,255,.07)}' +
      '.lang-sel li button[aria-current="true"]{background:rgba(255,255,255,.1)}' +
      '.lang-sel.cambiando>button{pointer-events:none}' +
      '.lang-sel.cambiando>button::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:2px solid transparent;border-top-color:#F4F1EA;animation:langGira .7s linear infinite}' +
      '@keyframes langGira{to{transform:rotate(360deg)}}' +
      '.lang-sel--flotante{position:fixed;top:14px;right:14px;z-index:900}' +
      '.lang-sel--flotante>button,.lang-sel--solido>button{background:rgba(12,13,17,.78);backdrop-filter:blur(8px)}' +
      '@media (max-width:640px){.lang-sel>button{width:36px;height:36px;font-size:.68rem}}';
    document.head.appendChild(st);
    const box = document.createElement('div');
    box.className = 'lang-sel';
    box.setAttribute('data-no-traducir', '');
    box.innerHTML = '<button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Idioma · Language · Idioma">' + lang.toUpperCase() + '</button>' +
      '<ul>' + Object.keys(IDIOMAS).map(l => '<li><button type="button" data-l="' + l + '"' + (l === lang ? ' aria-current="true"' : '') + '><b>' + l.toUpperCase() + '</b>' + IDIOMAS[l] + '</button></li>').join('') + '</ul>';
    const cta = document.querySelector('.nav .nav-cta');
    const lugar = document.querySelector('[data-lang-slot]');   // páginas sin menú que reservan su lugar
    if(lugar){
      box.classList.add('lang-sel--solido');
      lugar.appendChild(box);
    } else if(cta){
      const burger = cta.querySelector('.burger');
      if(burger) cta.insertBefore(box, burger); else cta.appendChild(box);
    } else {
      box.classList.add('lang-sel--flotante');
      document.body.appendChild(box);
    }
    const btn = box.querySelector('button');
    /* Apenas se toca el círculo se bajan en segundo plano los otros
       diccionarios: quedan en caché y el cambio de idioma es casi inmediato. */
    let precargado = false;
    const precargar = () => {
      if(precargado) return; precargado = true;
      Object.keys(IDIOMAS).filter(l => l !== 'es' && l !== lang).forEach(l => {
        try{ fetch('/assets/i18n/' + l + '.js?v=' + VERSION_DIC, { priority:'low' }).catch(() => {}); }catch(e){}
      });
    };
    btn.addEventListener('pointerdown', precargar, { passive:true });
    btn.addEventListener('click', e => { e.stopPropagation(); precargar(); const o = box.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
    /* Un solo toque alcanza: se cierra el menú, el círculo muestra el idioma
       nuevo girando mientras carga y los toques siguientes se ignoran (antes
       cada toque reiniciaba la recarga y parecía que había que insistir). */
    let cambiando = false;
    box.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      if(cambiando) return;
      if(b.dataset.l === lang){ box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); return; }
      cambiando = true;
      box.classList.remove('open');
      box.classList.add('cambiando');
      btn.textContent = b.dataset.l.toUpperCase();
      requestAnimationFrame(() => setTimeout(() => API.elegir(b.dataset.l), 30));
    }));
    document.addEventListener('click', e => { if(!box.contains(e.target)){ box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') box.classList.remove('open'); });
  }
  if(!coleccionar){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', selector); else selector();
  }
})();
