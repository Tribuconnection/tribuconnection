/* Uso: node tools/i18n/build.js  (y después node tools/i18n/glosario.js).
   Textos nuevos del sitio: agregarlos a extras.json como "español": ["inglés", "portugués"].
   Para encontrar textos sin traducir: levantar el sitio en localhost:5177 y correr check.js en (o pt). */
// Arma /assets/i18n/en.js y pt.js a partir de limpio.json + tr/*.json + extras.json
const fs = require('fs');
const OUT = require('path').join(__dirname, '../../tribu-landing/assets/i18n/');
const lista = require(__dirname + '/limpio-v1.json');
const tr = {};
for(const f of fs.readdirSync(__dirname + '/tr')) Object.assign(tr, JSON.parse(fs.readFileSync(__dirname + '/tr/' + f, 'utf8')));
const extras = JSON.parse(fs.readFileSync(__dirname + '/extras.json', 'utf8'));

/* --- misma lógica que assets/i18n.js --- */
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_ABR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DIAS_ABR = ['dom','lun','mar','mié','jue','vie','sáb'];
const RX_MES = new RegExp('(^|[^A-Za-zÁÉÍÓÚáéíóúñÑ])(' + MESES.concat(MESES_ABR, DIAS, DIAS_ABR).join('|') + ')(?![A-Za-zÁÉÍÓÚáéíóúñÑ])', 'gi');
const TRAD = {
  en:{ full:['January','February','March','April','May','June','July','August','September','October','November','December'], abr:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
       dias:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], dabr:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] },
  pt:{ full:['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'], abr:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],
       dias:['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'], dabr:['dom','seg','ter','qua','qui','sex','sáb'] }
};
const colapsar = s => String(s).replace(/\s+/g, ' ').trim();
const RXN = /\d+(?:[.,]\d+)*/g;
const soloDig = s => s.replace(/\D/g, '');
const escRx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function destinoFecha(w, lang){
  const p = w.toLowerCase(), T = TRAD[lang];
  let i;
  if((i = MESES.indexOf(p)) > -1) return [T.full[i]];
  if((i = MESES_ABR.indexOf(p)) > -1) return [T.abr[i], T.full[i]];
  if((i = DIAS.indexOf(p)) > -1) return [T.dias[i]];
  if((i = DIAS_ABR.indexOf(p)) > -1) return [T.dabr[i], T.dias[i]];
  return [];
}
function generalizar(es, trad, lang){
  let k = colapsar(es), v = trad;
  if(!/\d/.test(k)) return [k, v];
  // números
  const nums = [];
  k = k.replace(RXN, m => { nums.push(m); return '{' + (nums.length - 1) + '}'; });
  const usados = new Set();
  nums.forEach((n, i) => {
    let hecho = false;
    v = v.replace(RXN, (m, off) => {
      if(hecho || usados.has(off) || soloDig(m) !== soloDig(n)) return m;
      hecho = true; usados.add(off); return '{' + i + '}';
    });
  });
  // fechas (solo si hay números)
  const fechas = [];
  const kf = k.replace(RX_MES, (m, pre, w) => { fechas.push(w); return pre + '{m' + (fechas.length - 1) + '}'; });
  if(fechas.length){
    fechas.forEach((w, i) => {
      const cands = destinoFecha(w, lang).concat([w]);
      for(const c of cands){
        const rx = new RegExp('(^|[^A-Za-zÀ-ÿ])(' + escRx(c) + ')(?![A-Za-zÀ-ÿ])', 'i');
        if(rx.test(v)){ v = v.replace(rx, (m, pre) => pre + '{m' + i + '}'); break; }
      }
    });
    k = kf;
  }
  return [k, v];
}

for(const [li, lang] of [[0, 'en'], [1, 'pt']]){
  const dic = {};
  let n = 0;
  for(const [idx, par] of Object.entries(tr)){
    const es = lista[+idx];
    if(es == null || !par || par[li] == null) continue;
    const [k, v] = generalizar(es, par[li], lang);
    if(k === v && !k.includes('{m')) continue;
    dic[k] = v; n++;
  }
  for(const [es, par] of Object.entries(extras)){ if(par[li] != null && (es !== par[li] || es.includes('{m'))) dic[es] = par[li]; }
  fs.mkdirSync(OUT, { recursive:true });
  fs.writeFileSync(OUT + lang + '.js',
    '/* Tribu Connection — diccionario ' + lang.toUpperCase() + ' (generado: no editar a mano; ver assets/i18n.js) */\n' +
    'window.TRIBU_DIC=' + JSON.stringify(dic) + ';\nwindow.__tribuI18nListo&&window.__tribuI18nListo();\n');
  console.log(lang, Object.keys(dic).length, 'entradas', Math.round(fs.statSync(OUT + lang + '.js').size / 1024) + 'KB');
}
