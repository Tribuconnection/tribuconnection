// Extrae los textos de los scripts del sitio (externos e inline) -> literales.json
// { textos: [...], html: [...] }
const fs = require('fs'), path = require('path');
const acorn = require('acorn'), walk = require('acorn-walk');
const RAIZ = 'C:/Users/rodri/Desktop/Tribu Connection/tribu-landing/tribu-landing';
const fuentes = [];
fs.readdirSync(RAIZ + '/assets').filter(f => f.endsWith('.js') && !/^i18n/.test(f)).forEach(f => fuentes.push([f, fs.readFileSync(RAIZ + '/assets/' + f, 'utf8')]));
(function paginas(dir){
  for(const f of fs.readdirSync(dir)){
    const p = dir + '/' + f;
    if(f === 'node_modules' || f === 'assets' || f.startsWith('.') || /^admin-/.test(f)) continue;
    if(fs.statSync(p).isDirectory()) paginas(p);
    else if(f === 'index.html'){
      const s = fs.readFileSync(p, 'utf8');
      const re = /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi;
      let m, i = 0;
      while((m = re.exec(s))) fuentes.push([path.relative(RAIZ, p) + '#' + (i++), m[1]]);
    }
  }
})(RAIZ);

const LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
const textos = new Set(), html = new Set();
function pareceCodigo(s){
  const t = s.trim();
  if(!LETRA.test(t)) return true;
  if(/^[a-z0-9_\-.:#\[\]=()*>+~"' ]+$/.test(t) && !/\s/.test(t)) return true;            // ids, clases, selectores
  if(/^[.#\[][\w-]/.test(t) || /^(https?:|mailto:|tel:|\/|\.\/|data:)/.test(t)) return true;
  if(/^[a-z]+(-[a-z]+)+$/.test(t) || /^[a-z_]+$/.test(t)) return true;                        // nombres-de-clase, ids_de_catalogo
  if(/^(rgba?|hsla?|var|url|calc|linear-gradient)\(/.test(t) || /^#[0-9a-f]{3,8}$/i.test(t)) return true;
  if(/^[\w-]+(\s+[\w-]+)*$/.test(t) && /[-_]/.test(t) && !/[A-ZÁÉÍÓÚ]/.test(t)) return true;    // "btn btn--ghost"
  if(/[{};]\s*$/.test(t) && /:/.test(t)) return true;                                          // CSS
  if(/^\w+\(.*\)$/.test(t)) return true;
  return false;
}
function agregar(v){
  if(typeof v !== 'string') return;
  if(v.includes('<')) { if(LETRA.test(v.replace(/<[^>]*>/g, ''))) html.add(v); return; }
  if(pareceCodigo(v)) return;
  textos.add(v.replace(/\s+/g, ' ').trim());
}
for(const [nombre, src] of fuentes){
  let ast;
  try{ ast = acorn.parse(src, { ecmaVersion:'latest', sourceType:'script', allowReturnOutsideFunction:true, allowAwaitOutsideFunction:true }); }
  catch(e){ try{ ast = acorn.parse(src, { ecmaVersion:'latest', sourceType:'module' }); } catch(e2){ console.error('NO PARSEA', nombre, e2.message); continue; } }
  walk.full(ast, n => {
    if(n.type === 'Literal') agregar(n.value);
    else if(n.type === 'TemplateLiteral') n.quasis.forEach(q => agregar(q.value.cooked));
  });
}
fs.writeFileSync('C:/tmp/i18n/literales.json', JSON.stringify({ textos:[...textos], html:[...html] }, null, 1));
console.log('textos', textos.size, 'html', html.size);
