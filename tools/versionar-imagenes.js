const fs = require('fs'), path = require('path');

/* .htaccess cachea los assets un año. Si cambiás el contenido de una imagen
   sin cambiar su URL, quien ya visitó el sitio se queda con la vieja hasta que
   se le venza la caché. Este script le agrega ?v=N a las referencias de
   /assets/ que no tengan versión.

   Uso:  node tools/versionar-imagenes.js [N]      (N por defecto: 2)

   Se excluyen los íconos PWA: los referencia el manifest y el service worker,
   donde la URL es parte del contrato de instalación. */

const SITIO = path.join(__dirname, '..', 'tribu-landing');
const VERSION = process.argv[2] || '2';
const EXCLUDE_FILE = /(manifest\.json|sw\.js)$/i;
const EXCLUDE_ASSET = /assets\/pwa-/i;
const RE = /(\/assets\/[A-Za-z0-9/_.-]+\.(?:png|jpe?g|webp))(?!\?)/g;

let touched = 0, hits = 0;
(function walk(dir){
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['.git', 'node_modules'].includes(e.name)) walk(fp);
    } else if (/\.(html|css|js|json)$/i.test(e.name) && !EXCLUDE_FILE.test(e.name)) {
      const src = fs.readFileSync(fp, 'utf8');
      const out = src.replace(RE, (m, p) => {
        if (EXCLUDE_ASSET.test(p)) return m;
        hits++;
        return p + '?v=' + VERSION;
      });
      if (out !== src) { fs.writeFileSync(fp, out); touched++; console.log('  ' + path.relative(SITIO, fp).split(path.sep).join('/')); }
    }
  }
})(SITIO);
console.log(`\n${hits} referencias llevadas a ?v=${VERSION} en ${touched} archivos`);
