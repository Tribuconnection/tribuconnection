# Herramientas de performance

Scripts de mantenimiento, **fuera de `tribu-landing/`** a propósito: el deploy
sube por FTP todo lo que haya en esa carpeta, así que nada de esto llega al
servidor. Se corren desde la raíz del repo.

## `optimizar-imagenes.js`

Redimensiona y recomprime todas las imágenes de `tribu-landing/`.

Los tamaños objetivo salen de medir en producción a qué tamaño se ve cada
imagen de verdad, x2 para pantallas retina. Si agregás una imagen nueva grande,
sumala al objeto `TARGETS` con su ancho objetivo; si no, le aplica el tope
general (`DEFAULT_MAX`, 900 px).

```bash
npm i sharp --no-save
node tools/optimizar-imagenes.js
```

Nunca pisa una imagen con una versión más pesada, y guarda el original intacto
en `tools/originales-imagenes/`. Siempre reencodea **desde el original**, nunca
desde la imagen ya procesada, así correrlo dos veces da exactamente el mismo
resultado y no degrada nada. **No borres esa carpeta**: son los únicos
originales en calidad completa.

## `versionar-imagenes.js`

Le sube el número de versión a las referencias de `/assets/...`.

`.htaccess` cachea los assets un año, así que si cambiás el contenido de una
imagen sin cambiar su URL, quien ya visitó el sitio se queda con la vieja.
Cada vez que recomprimas o reemplaces imágenes hay que subirles la versión en
todos los lugares donde se usan.

```bash
node tools/versionar-imagenes.js 3    # pone ?v=3 donde no haya versión
```

Excluye los íconos PWA a propósito: sus URLs son parte del contrato del
`manifest.json` y del service worker.

> Ojo con correr un reemplazo masivo de `?v=` sobre `*.js` desde la raíz: una
> vez se comió una clave de `TARGETS` acá adentro y el logo salió al tamaño por
> defecto. Estos scripts quedan fuera del alcance de `versionar-imagenes.js`
> justamente por eso.
