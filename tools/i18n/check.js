// Recorre páginas en ?lang=XX y lista textos que parecen haber quedado en español
const { spawn } = require('child_process'); const fs = require('fs');
const LANG = process.argv[2] || 'en';
const BASE = 'http://localhost:5177';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--remote-debugging-port=9335','--user-data-dir=C:/tmp/i18n/prof2','about:blank'], { stdio:'ignore' });
(async () => {
  let tgt; for(let i=0;i<40&&!tgt;i++){ try{ tgt=(await (await fetch('http://127.0.0.1:9335/json')).json()).find(t=>t.type==='page'); }catch(e){} if(!tgt) await sleep(250); }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
  let id=0; const pend={}; ws.onmessage=m=>{ const d=JSON.parse(m.data); if(d.id&&pend[d.id]){ pend[d.id](d.result||d); delete pend[d.id]; } };
  const send=(method,params={})=>new Promise(r=>{ const i=++id; pend[i]=r; ws.send(JSON.stringify({id:i,method,params})); });
  const ev=async js=>{ const r=await send('Runtime.evaluate',{expression:'(async()=>{'+js+'})()',awaitPromise:true,returnByValue:true}); return r.result&&r.result.value; };
  await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  const PAGS = ['/', '/agenda/', '/agenda/evento/?id=fiesta-sana', '/club-tribu-connection/', '/organizas-experiencias/', '/representas-marca/', '/red-tribu/', '/rodrigo-ezequiel-pedernera', '/autodiagnostico-financiero-de-mi-evento/', '/un-instante-eterno/', '/cuenta/'];
  const ACC = `const w=ms=>new Promise(r=>setTimeout(r,ms));
    for(const s of ['[data-signup]','[data-caminos]','[data-cotizar]','[data-solicitud]','[data-join]']){ const e=document.querySelector(s); if(e){ e.click(); await w(400); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); await w(150);} }
    const i=document.querySelector('.nav .nav-search-input'); if(i){ i.value='yoga'; i.dispatchEvent(new Event('input')); await w(2500); i.value='palermo'; i.dispatchEvent(new Event('input')); await w(300); }
    document.querySelectorAll('details').forEach(d=>d.open=true);
    const ES=/(^|[^a-záéíóúñ])(tenés|podés|querés|sumá|sumate|contanos|descubrí|organizás|impulsás|creás|vos|acá|también|nuestro|nuestra|nuestros|nuestras|experiencias|creadores|lugares|cómo|qué|dónde|más|años|y|el|los|las|del|una|con|para|ver)(?![a-záéíóúñ])|ñ|¿|¡/i; const out=new Set(); const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT); let n; while(n=tw.nextNode()){ if(n.nodeType===1){ if(n.closest('[data-no-traducir],script,style,svg')) continue; for(const at of ['placeholder','aria-label','title','alt']){ const v=n.getAttribute(at); if(v&&ES.test(v)) out.add('['+at+'] '+v.slice(0,140)); } } else { if(n.parentElement.closest('[data-no-traducir],script,style,svg')) continue; const t=n.data.replace(/s+/g,' ').trim(); if(t.length>1&&ES.test(t)) out.add(t.slice(0,160)); } } out.add('TITLE: '+document.title); return [...out];`;
  const res = {};
  for(const p of PAGS){
    await send('Page.navigate',{url:BASE+p+(p.includes('?')?'&':'?')+'lang='+LANG}); await sleep(3800);
    res[p] = await ev(ACC);
    console.log('== '+p+' ('+(res[p]||[]).length+')'); (res[p]||[]).forEach(x=>console.log('   '+x));
  }
  fs.writeFileSync('C:/tmp/i18n/faltan-'+LANG+'.json', JSON.stringify(res,null,1));
  ws.close(); chrome.kill(); process.exit(0);
})();
