const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Target width per file. Chosen from the size each image is actually RENDERED at
// in the browser (measured on production), x2 for retina. "null" = keep size,
// only recompress.
const TARGETS = {
  // --- iconos e isotipos: se muestran a 17-29px y pesaban 1254x1254 ---
  'assets/isotipo-club-mano.png':         120,
  'assets/isotipo-creadores-estrellas.png':120,
  'assets/isotipo.png':                   null,  // 320x310, se usa a 170px
  // --- logos ---
  'assets/logo-blanco.png':               420,   // nav: se ve a 133x42
  'assets/logo-white-horizontal.png?v=2':    1200,   // emails (180px) + placas.js (canvas)
  'assets/logo-color-horizontal.png':    1200,
  'assets/logo-full.png':                1200,
  'assets/logo_white.png':                400,
  // --- PWA / OG: el tamano es parte del contrato, solo recomprimir ---
  'assets/pwa-512.png':                   null,
  'assets/pwa-192.png':                   null,
  'assets/pwa-180.png':                   null,
  'assets/og-image.png':                  null,
  'assets/og-autodiagnostico-financiero.png': null,
  // --- collage del hero: medido a 299x491 y 221x238 en produccion ---
  'assets/stories/meditacion-grupal.jpg': 620,
  'assets/stories/entrevista-oikos.jpg':  480,
};

// Tope general para el resto de las fotos (stories, reels, un-instante-eterno)
const DEFAULT_MAX = 900;
const PNG_OPTS  = { compressionLevel: 9, effort: 10, palette: true };
const JPEG_OPTS = { quality: 72, mozjpeg: true, chromaSubsampling: '4:2:0' };
const WEBP_OPTS = { quality: 74, effort: 6 };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['.git', 'node_modules', '.perf-originals'].includes(e.name)) walk(fp, out);
    } else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(fp);
  }
  return out;
}

(async () => {
  const files = walk('.');
  let before = 0, after = 0, webpTotal = 0;
  const log = [];

  for (const file of files) {
    const key = file.split(path.sep).join('/');
    const isPng = /\.png$/i.test(file);
    const target = key in TARGETS ? TARGETS[key] : DEFAULT_MAX;

    const orig = path.join('.perf-originals', key);
    fs.mkdirSync(path.dirname(orig), { recursive: true });
    if (!fs.existsSync(orig)) fs.copyFileSync(file, orig);

    const srcBuf = fs.readFileSync(orig);
    const meta = await sharp(srcBuf).metadata();
    const sizeBefore = srcBuf.length;
    before += sizeBefore;

    let pipe = sharp(srcBuf).rotate();
    if (target && meta.width > target) pipe = pipe.resize({ width: target, withoutEnlargement: true });

    const outBuf = await (isPng ? pipe.png(PNG_OPTS) : pipe.jpeg(JPEG_OPTS)).toBuffer();
    // nunca empeorar: si la version nueva pesa mas, dejar la original
    const finalBuf = outBuf.length < sizeBefore ? outBuf : srcBuf;
    fs.writeFileSync(file, finalBuf);
    after += finalBuf.length;

    // WebP al lado, para las fotos que sirvamos con <picture> / image-set
    const webpPath = file.replace(/\.(png|jpe?g)$/i, '.webp');
    let wPipe = sharp(srcBuf).rotate();
    if (target && meta.width > target) wPipe = wPipe.resize({ width: target, withoutEnlargement: true });
    const webpBuf = await wPipe.webp(WEBP_OPTS).toBuffer();
    fs.writeFileSync(webpPath, webpBuf);
    webpTotal += webpBuf.length;

    const newMeta = await sharp(finalBuf).metadata();
    log.push({
      file: key,
      dim: `${meta.width}x${meta.height} -> ${newMeta.width}x${newMeta.height}`,
      kb: `${(sizeBefore / 1024).toFixed(1)} -> ${(finalBuf.length / 1024).toFixed(1)}`,
      webpKb: (webpBuf.length / 1024).toFixed(1),
      saved: sizeBefore - finalBuf.length,
    });
  }

  log.sort((a, b) => b.saved - a.saved);
  for (const r of log.slice(0, 25)) {
    console.log(`${String((r.saved / 1024).toFixed(1)).padStart(8)} KB ahorrados | ${r.kb.padEnd(18)} KB | ${r.dim.padEnd(24)} | webp ${r.webpKb} KB | ${r.file}`);
  }
  console.log('\n--- TOTAL ---');
  console.log(`antes:      ${(before / 1024 / 1024).toFixed(2)} MB`);
  console.log(`despues:    ${(after / 1024 / 1024).toFixed(2)} MB  (-${(100 - after / before * 100).toFixed(0)}%)`);
  console.log(`webp:       ${(webpTotal / 1024 / 1024).toFixed(2)} MB  (-${(100 - webpTotal / before * 100).toFixed(0)}%)`);
})();
