// Recorre el sitio en modo colección (?i18n=collect) y junta todos los textos.
const { spawn } = require('child_process');
const fs = require('fs');
const BASE = 'http://localhost:5177';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--remote-debugging-port=9334', '--user-data-dir=C:/tmp/i18n/prof', '--hide-scrollbars', 'about:blank'], { stdio:'ignore' });

/* Experiencia de mentira para que la ficha muestre todas sus secciones. */
const XP = [{ id:'00000000-0000-0000-0000-000000000001', profile_id:'00000000-0000-0000-0000-000000000002', nombre:'Prueba', tipo:'Taller', descripcion:'x', fecha:'2099-12-01', horario:'19 h', modalidad:'Presencial', ciudad_barrio:'Palermo', lugar:'Lugar', categorias:['Yoga'], publicado:true,
  imagen_portada_url:null, proyecto_nombre:'P', organiza_nombre:'O', instagram:'x', colaboradores:'Personas', club_beneficio:'10% off', acceso_tipo:'pago', precio:'$ 10.000', alias:'a.b.c', titular:'T', cbu:'0000', solicitar_comprobante:true, modalidad_cobro:'Transferencia', link_reserva:null, instrucciones:'i', cupo:'20 lugares', reserva_previa:true, estado_publicacion:'publicado',
  galeria:[], video_url:null, valor_titulo:'v', valor_texto:'v', valor_bloques:[{titulo:'a',texto:'b'}], como_se_vive:[{titulo:'a',texto:'b'}], que_compartimos:['a'], que_compartimos_nota:'n', testimonios:[{texto:'t',nombre:'n'}], faq:[{p:'p',r:'r'}], recomendaciones:['r'], mensaje_cierre:'m',
  equipo:[{nombre:'n',rol:'r'}], duracion_horas:2, cantidad_dias:1, publico:['adultos'], tipo_participacion:['grupal'], idiomas:['espanol'], precio_numero:10000, precio_club:8000 }];

(async () => {
  let tgt;
  for(let i = 0; i < 40 && !tgt; i++){ try{ tgt = (await (await fetch('http://127.0.0.1:9334/json')).json()).find(t => t.type === 'page'); }catch(e){} if(!tgt) await sleep(250); }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {};
  ws.onmessage = async m => {
    const d = JSON.parse(m.data);
    if(d.id && pend[d.id]){ pend[d.id](d.result || d); delete pend[d.id]; }
    if(d.method === 'Fetch.requestPaused'){
      const u = d.params.request.url;
      if(/rest\/v1\/experiences/.test(u) && /id=eq\.0000/.test(u)){
        const body = Buffer.from(JSON.stringify(/maybeSingle|single/.test(JSON.stringify(d.params.request.headers)) ? XP[0] : XP)).toString('base64');
        send('Fetch.fulfillRequest', { requestId:d.params.requestId, responseCode:200, responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}], body });
      } else send('Fetch.continueRequest', { requestId:d.params.requestId });
    }
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id:i, method, params })); });
  const ev = async js => { const r = await send('Runtime.evaluate', { expression:'(async()=>{' + js + '})()', awaitPromise:true, returnByValue:true }); return r.result && r.result.value; };
  await send('Page.enable');
  await send('Fetch.enable', { patterns:[{ urlPattern:'*rest/v1/experiences*' }] });
  await send('Emulation.setDeviceMetricsOverride', { width:1440, height:900, deviceScaleFactor:1, mobile:false });

  const todos = new Set();
  const juntar = async () => (await ev('return [...window.__i18n.vistos]') || []).forEach(t => todos.add(t));
  const ir = async (url, ms = 3500) => { await send('Page.navigate', { url: BASE + url + (url.includes('?') ? '&' : '?') + 'i18n=collect' }); await sleep(ms); };

  /* Acciones comunes: modales del header, buscador */
  const COMUN = `
    const w = ms => new Promise(r => setTimeout(r, ms));
    const clic = async sel => { const e = document.querySelector(sel); if(e){ e.click(); await w(500); } };
    const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape' }));
    await clic('[data-signup]'); esc(); await w(200);
    await clic('[data-auth]'); esc(); await w(200);
    await clic('[data-caminos]'); esc();
    await clic('[data-connect]'); esc();
    await clic('#burger'); await clic('#burger');
    const i = document.querySelector('.nav .nav-search-input');
    if(i){ for(const q of ['a','e','o','club','yoga','resonar','palermo','zzzz','festival','taller','privacidad','cuenta']){ i.value = q; i.dispatchEvent(new Event('input')); await w(q === 'a' ? 2500 : 150); } i.value=''; i.dispatchEvent(new Event('input')); }
    return 1;`;

  const PAGINAS = [
    ['/', ''],
    ['/agenda/', `const w = ms => new Promise(r => setTimeout(r, ms));
      document.getElementById('calAdd')?.click(); await w(400);
      for(let k=0;k<3;k++){ document.querySelector('#calNext, .cal-next, [data-cal-next]')?.click(); await w(200); }
      document.querySelectorAll('.cal-filter, #calFilters button').forEach(b=>b.click());
      const d = document.querySelector('#calDays .has-ev, #calDays button'); d && d.click(); await w(300); return 1;`],
    ['/agenda/evento/?id=fiesta-sana', ''],
    ['/agenda/evento/?id=amanita-festival-el-portal', ''],
    ['/agenda/evento/?id=no-existe', ''],
    ['/club-tribu-connection/', `document.querySelector('[data-join]')?.click(); await new Promise(r=>setTimeout(r,400)); return 1;`],
    ['/organizas-experiencias/', `const w = ms => new Promise(r => setTimeout(r, ms));
      for(const s of ['[data-cotizar-que="Servicio especial"]','[data-cotizar-que="Plan de Comunicación Continua"]','[data-cotizar-que="Primera conversación"]','[data-solicitud]']){ document.querySelector(s)?.click(); await w(400); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); await w(150); }
      document.querySelectorAll('details').forEach(d=>d.open=true); return 1;`],
    ['/representas-marca/', `const w = ms => new Promise(r => setTimeout(r, ms));
      for(const s of ['[data-cotizar-que="Servicio especial"]','[data-cotizar-que="Plan de Comunicación Continua"]','[data-cotizar-que="Primera conversación"]','[data-solicitud]']){ document.querySelector(s)?.click(); await w(400); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); await w(150); }
      return 1;`],
    ['/red-tribu/', `const w = ms => new Promise(r => setTimeout(r, ms));
      for(const t of ['creador','comunidad','experiencia','marca','lugar','todos']){
        document.querySelector('#dirTabs .rt-tab[data-tab="'+t+'"]')?.click(); await w(300);
        document.getElementById('btnFiltros')?.click(); await w(300);
        document.querySelectorAll('#panelFiltros button, #panelFiltros summary').forEach(b=>{ if(!/limpiar|ver/i.test(b.textContent)) try{ b.click(); }catch(e){} });
        await w(300);
        document.getElementById('btnFiltros')?.click(); await w(200);
      }
      const s = document.getElementById('dirSearch'); s.value='zzzzzz'; s.dispatchEvent(new Event('input')); await w(300);
      document.querySelector('.rt-ubi, #ddUbicacion, [data-ubicacion]')?.click(); await w(300);
      return 1;`],
    ['/rodrigo-ezequiel-pedernera', `const w = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('[data-conectar], #btnConectarPortada, .pp-portada-acc .btn')?.click(); await w(500);
      document.querySelectorAll('#sheetOpciones .pp-opcion')[1]?.click(); await w(500); return 1;`],
    ['/experiencia/?id=00000000-0000-0000-0000-000000000001', `const w = ms => new Promise(r => setTimeout(r, ms));
      await w(1500); document.querySelector('[data-reservar]')?.click(); await w(600); return 1;`],
    ['/experiencia/?id=no-existe', ''],
    ['/autodiagnostico-financiero-de-mi-evento/', `document.querySelectorAll('input[type=radio]').forEach(r=>r.click()); document.querySelectorAll('button').forEach(b=>{ if(/resultado|siguiente|calcular|ver/i.test(b.textContent)) try{b.click()}catch(e){} }); await new Promise(r=>setTimeout(r,600)); return 1;`],
    ['/un-instante-eterno/', ''],
    ['/formulario-externo/', '']
  ];
  for(const [url, js] of PAGINAS){
    await ir(url);
    try{ await ev(COMUN); if(js) await ev(js); }catch(e){ console.error('err', url, e.message); }
    await sleep(400);
    await juntar();
    console.log(url, todos.size);
  }
  /* Chat "Tri": abrir y recorrer todas las respuestas de su base de conocimiento */
  await ir('/');
  await ev(`const w = ms => new Promise(r => setTimeout(r, ms));
    document.querySelector('.tc-bot, .tc-fab, [data-tri], .tc-launcher')?.click(); await w(600); return 1;`);
  await juntar();

  /* (B) HTML estático de todas las páginas + (C) fragmentos HTML de los scripts */
  const lit = JSON.parse(fs.readFileSync('C:/tmp/i18n/literales.json', 'utf8'));
  const paginasEstaticas = ['/', '/agenda/', '/agenda/evento/', '/club-tribu-connection/', '/organizas-experiencias/', '/representas-marca/', '/red-tribu/', '/perfil-publico/', '/experiencia/',
    '/cuenta/', '/cuenta/perfil/', '/cuenta/perfil/editar/', '/cuenta/publicar/', '/cuenta/portal/', '/cuenta/onboarding/participacion/', '/cuenta/onboarding/personalizar/',
    '/autodiagnostico-financiero-de-mi-evento/', '/un-instante-eterno/', '/formulario-externo/'];
  await ir('/');
  const r = await ev(`
    const out = new Set();
    const pags = ${JSON.stringify(paginasEstaticas)};
    for(const p of pags){
      const html = await (await fetch(p)).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      window.__i18n.vistos.clear();
      window.__i18n.recorrer(doc.body);
      const t = doc.querySelector('title'); if(t) out.add(t.textContent.replace(/\\s+/g,' ').trim());
      window.__i18n.vistos.forEach(x => out.add(x));
    }
    const frags = ${JSON.stringify(lit.html)};
    for(const f of frags){
      const d = document.createElement('div');
      try{ d.innerHTML = f; }catch(e){ continue; }
      window.__i18n.vistos.clear();
      window.__i18n.recorrer(d);
      window.__i18n.vistos.forEach(x => out.add(x));
    }
    return [...out];`);
  (r || []).forEach(t => todos.add(t));
  console.log('con estáticos y fragmentos', todos.size);
  lit.textos.forEach(t => todos.add(t));
  fs.writeFileSync('C:/tmp/i18n/textos.json', JSON.stringify([...todos].sort(), null, 1));
  console.log('total', todos.size);
  ws.close(); chrome.kill(); process.exit(0);
})();
