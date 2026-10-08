const fs = require('fs'), path = require('path');
// Todas las imagenes de /assets se recomprimieron, y .htaccess las cachea un
// ano. Sin cambiar la URL, quien ya visito el sitio se queda con las viejas
// (pesadas) hasta 2027. Agregamos ?v=2 a las que no tenian version.
// Se excluyen los iconos PWA: los referencia el manifest y el service worker,
// donde la URL es parte del contrato de instalacion.
const EXCLUDE_FILE = /(manifest\.json|sw\.js)$/i;
const EXCLUDE_ASSET = /assets\/pwa-/i;
const RE = /(\/assets\/[A-Za-z0-9/_.-]+\.(?:png|jpe?g|webp))(?!\?)/g;

let touched = 0, hits = 0;
(function walk(dir){
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['.git', 'node_modules', '.perf-originals'].includes(e.name)) walk(fp);
    } else if (/\.(html|css|js|json)$/i.test(e.name) && !EXCLUDE_FILE.test(e.name) && !e.name.startsWith('.perf-')) {
      const src = fs.readFileSync(fp, 'utf8');
      const out = src.replace(RE, (m, p) => {
        if (EXCLUDE_ASSET.test(p)) return m;
        hits++;
        return p + '?v=2';
      });
      if (out !== src) { fs.writeFileSync(fp, out); touched++; console.log('  ' + fp.split(path.sep).join('/')); }
    }
  }
})('.');
console.log(`\n${hits} referencias versionadas en ${touched} archivos`);
