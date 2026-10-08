# Herramientas de performance

Scripts de un solo uso, **fuera de `tribu-landing/`** a propósito: el deploy sube
por FTP todo lo que haya en esa carpeta, así que nada de esto llega al servidor.

## `optimizar-imagenes.js`

Redimensiona y recomprime todas las imágenes de `tribu-landing/`, y genera un
`.webp` al lado de cada una cuando conviene.

Los tamaños objetivo salen de medir en producción a qué tamaño se ve cada imagen
de verdad, x2 para pantallas retina. Si agregás una imagen nueva grande, sumala
al objeto `TARGETS` con su ancho objetivo; si no, le aplica el tope general
(`DEFAULT_MAX`, 900 px).

```bash
cd tribu-landing
npm i sharp --no-save
node ../tools/optimizar-imagenes.js
```

Nunca pisa una imagen con una versión más pesada, y guarda el original intacto en
`tools/originales-imagenes/` (de ahí reencodea siempre, así correrlo dos veces no
degrada la calidad). **No borres esa carpeta**: son los únicos originales.

## `versionar-imagenes.js`

Le agrega `?v=2` a las referencias de `/assets/...` que no tengan versión.

`.htaccess` cachea los assets un año, así que si cambiás el contenido de una
imagen sin cambiar su URL, quien ya visitó el sitio se queda con la vieja. Cada
vez que recomprimas o reemplaces una imagen hay que subirle el número de versión
en todos los lugares donde se usa.

```bash
cd tribu-landing
node ../tools/versionar-imagenes.js
```

Excluye los íconos PWA a propósito: sus URLs son parte del contrato del
`manifest.json` y del service worker.
