// Limpia textos.json -> limpio.json (solo texto de interfaz)
const fs = require('fs');
const crudo = require('./textos.json');
const out = new Set();
const LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
for(let s of crudo){
  s = String(s).replace(/\s+/g, ' ').trim();
  // restos de atributos de fragmentos HTML: '" class="x">Texto' -> 'Texto'
  if(/^["'][^<]*?>/.test(s) || /^[\w-]+="[^"]*">/.test(s)) s = s.replace(/^[^>]*>/, '').trim();
  if(/="|^"|"$/.test(s) && !/<[a-z]/.test(s)) continue;
  if(!LETRA.test(s)) continue;
  if(/\$\{|=>|===|&&|\|\||\bfunction\b|document\.|querySelector|\.classList|window\.|\breturn\b|console\./.test(s)) continue;
  if(/^(https?:|www\.|mailto:|tel:|\/)/.test(s)) continue;
  if(/^[\w.-]+@[\w.-]+$/.test(s)) continue;
  if(/^[a-z0-9_]+$/.test(s)) continue;                         // ids
  if(/^[a-z]+([A-Z][a-z]+)+$/.test(s)) continue;                // camelCase
  if(/^[A-Z_]{3,}$/.test(s)) continue;                           // CONSTANTES
  if(/^[\w-]+\.(js|css|png|jpg|svg|webp|html)(\?.*)?$/.test(s)) continue;
  if(/^(image|video|application|text)\/[\w+.-]+$/.test(s)) continue;
  if(/^[a-z-]+:\s*[^;]+;?$/.test(s) && !/\s[a-záéíóú]{4,}\s/.test(s)) continue;  // css
  if(/^\d+([.,]\d+)?\s*(px|rem|em|%|vh|vw|ms|s)$/.test(s)) continue;
  if(/^[^A-Za-zÁÉÍÓÚáéíóúñÑ]*[A-Za-z]?[^A-Za-zÁÉÍÓÚáéíóúñÑ]*$/.test(s)) continue; // una sola letra suelta
  out.add(s);
}
const lista = [...out].sort((a, b) => a.localeCompare(b, 'es'));
fs.writeFileSync('C:/tmp/i18n/limpio.json', JSON.stringify(lista, null, 1));
console.log(lista.length, 'textos;', lista.reduce((n, s) => n + s.length, 0), 'caracteres');
