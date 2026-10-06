/* Placas para redes de Tribu Connection (portal del creador/a).
   Todo se dibuja en <canvas> en el navegador: lo que se ve en pantalla es
   exactamente lo que se descarga como JPG (1080 px de ancho).

   - perfil(canvas, formato, datos): la placa de la persona, foto a sangre con
     fundido negro arriba y abajo para que los textos se lean.
   - lineup(canvas, datos): lista de nombres (Red Tribu por área, marcas...).
   - agenda(canvas, datos): próximos eventos.

   El encuadre de la foto (x, y en 0-100 y zoom >= 1) usa la misma cuenta que
   CSS object-fit:cover + object-position + transform:scale con
   transform-origin en x% y%, así la landing y Red Tribu muestran la foto
   igual que las placas. */
const TribuPlacas = (function(){
  const FORMATOS = { post: { w: 1080, h: 1350 }, story: { w: 1080, h: 1920 } };
  const C = {
    ink: '#0C0D10', cream: '#F4F1EA', soft: '#C7C9D1', muted: '#8A8D98',
    red: '#D24B62', amber: '#F4A623', green: '#9BCB46', teal: '#36B7C4', purple: '#9B7CB8'
  };
  const SPECTRUM = [C.red, C.amber, C.green, C.teal, C.purple];

  let listo = null;
  const imgs = {};

  function cargarImg(src, cors){
    return new Promise((res, rej) => {
      const i = new Image();
      if(cors) i.crossOrigin = 'anonymous';
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('No se pudo cargar la imagen'));
      i.src = src;
    });
  }

  /* Tipografías y logos: hay que esperarlos antes de dibujar, si no el canvas
     usa la fuente por defecto y la placa sale con otra letra. */
  function preparar(){
    if(listo) return listo;
    const fuentes = ['400 80px "Protest Strike"', '800 60px Poppins', '700 40px Poppins', '600 40px Poppins', '500 40px Poppins', 'italic 400 40px Poppins'];
    listo = Promise.all([
      ...fuentes.map(f => document.fonts.load(f).catch(() => {})),
      cargarImg('/assets/logo-white-horizontal.png').then(i => { imgs.logo = i; }).catch(() => {}),
      cargarImg('/assets/isotipo.png?v=2').then(i => { imgs.iso = i; }).catch(() => {})
    ]).then(() => document.fonts.ready);
    return listo;
  }

  function cubrir(img, rw, rh, x, y, zoom){
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(rw / iw, rh / ih) * (zoom || 1);
    const dw = iw * s, dh = ih * s;
    return { dx: (rw - dw) * (x / 100), dy: (rh - dh) * (y / 100), dw, dh };
  }

  function espectro(ctx, x0, y0, x1, y1, alpha){
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    SPECTRUM.forEach((c, i) => g.addColorStop(i / (SPECTRUM.length - 1), alpha == null ? c : hexA(c, alpha)));
    return g;
  }
  function hexA(hex, a){
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function rr(ctx, x, y, w, h, r){
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  }

  function espaciado(ctx, px){ if('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }

  /* Corta un texto en renglones que entren en maxW. */
  function renglones(ctx, texto, maxW){
    const out = [];
    String(texto || '').split(/\n/).forEach(par => {
      const palabras = par.split(/\s+/).filter(Boolean);
      let linea = '';
      palabras.forEach(p => {
        const prueba = linea ? linea + ' ' + p : p;
        if(ctx.measureText(prueba).width <= maxW || !linea) linea = prueba;
        else { out.push(linea); linea = p; }
      });
      if(linea) out.push(linea);
    });
    return out;
  }
  function recortar(ctx, lineas, max, maxW){
    if(lineas.length <= max) return lineas;
    const r = lineas.slice(0, max);
    let ult = r[max - 1];
    while(ult.length > 1 && ctx.measureText(ult + '…').width > maxW) ult = ult.slice(0, -1);
    r[max - 1] = ult.replace(/[\s,.;:]+$/, '') + '…';
    return r;
  }

  function fondoAurora(ctx, W, H){
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    [[0, H, W * .85, C.red, .30], [W, 0, W * .8, C.teal, .26], [W, H, W * .7, C.purple, .24], [0, 0, W * .6, C.amber, .16]].forEach(([x, y, r, c, a]) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(c, a)); g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
  }

  function marco(ctx, W, H){
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = espectro(ctx, 0, 0, W, H, .9);
    rr(ctx, 34, 34, W - 68, H - 68, 46);
    ctx.stroke();
    ctx.restore();
  }

  function logo(ctx, W, y, ancho){
    if(!imgs.logo) return 0;
    const h = ancho * imgs.logo.naturalHeight / imgs.logo.naturalWidth;
    ctx.drawImage(imgs.logo, (W - ancho) / 2, y, ancho, h);
    return h;
  }

  function pie(ctx, W, H, texto){
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 30px Poppins'; ctx.fillStyle = C.soft;
    espaciado(ctx, 1);
    ctx.fillText(texto, W / 2, H - 92);
    ctx.restore();
  }

  function pastilla(ctx, cx, y, texto, color, oscuro){
    ctx.save();
    ctx.font = '700 25px Poppins'; espaciado(ctx, 4);
    const w = ctx.measureText(texto).width + 52, h = 52;
    ctx.fillStyle = color; rr(ctx, cx - w / 2, y, w, h, 14); ctx.fill();
    ctx.fillStyle = oscuro ? '#15110F' : '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(texto, cx + 2, y + h / 2 + 1);
    ctx.restore();
    return h;
  }

  /* ===================== Placa de perfil ===================== */
  function perfil(canvas, formato, d){
    const { w: W, h: H } = FORMATOS[formato];
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if(d.img){
      ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
      const r = cubrir(d.img, W, H, d.x == null ? 50 : d.x, d.y == null ? 50 : d.y, d.zoom || 1);
      ctx.drawImage(d.img, r.dx, r.dy, r.dw, r.dh);
    } else if(d.vacio){
      // Sin foto: la silueta de perfil en el color de la categoría, chica y
      // arriba para que no choque con el nombre.
      ctx.fillStyle = '#15171F'; ctx.fillRect(0, 0, W, H);
      const yCab = H * (formato === 'story' ? .34 : .25);
      const rg = ctx.createRadialGradient(W / 2, yCab, 0, W / 2, yCab, W * .85);
      rg.addColorStop(0, hexA(d.vacio, .34)); rg.addColorStop(1, hexA(d.vacio, .05));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      const k = W * (formato === 'story' ? .0046 : .004);
      ctx.save(); ctx.translate(W / 2 - 100 * k, yCab - 58 * k); ctx.scale(k, k);
      ctx.fillStyle = hexA(d.vacio, .92);
      ctx.beginPath(); ctx.arc(100, 58, 25, 0, Math.PI * 2); ctx.fill();
      ctx.fill(new Path2D('M50 138c0-27 22-46 50-46s50 19 50 46z'));
      ctx.restore();
    } else {
      fondoAurora(ctx, W, H);
      if(imgs.iso){ const s = W * .42; ctx.globalAlpha = .9; ctx.drawImage(imgs.iso, (W - s) / 2, H * .3, s, s * imgs.iso.naturalHeight / imgs.iso.naturalWidth); ctx.globalAlpha = 1; }
    }

    // Fundido negro arriba (logo) y abajo (textos)
    let g = ctx.createLinearGradient(0, 0, 0, H * .3);
    g.addColorStop(0, 'rgba(12,13,16,.9)'); g.addColorStop(1, 'rgba(12,13,16,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .3);
    const iniBajo = formato === 'story' ? .5 : .42;
    g = ctx.createLinearGradient(0, H * iniBajo, 0, H);
    g.addColorStop(0, 'rgba(12,13,16,0)'); g.addColorStop(.45, 'rgba(12,13,16,.82)'); g.addColorStop(1, 'rgba(12,13,16,1)');
    ctx.fillStyle = g; ctx.fillRect(0, H * iniBajo, W, H * (1 - iniBajo));
    [[0, H, C.red, .32], [W, H, C.teal, .26]].forEach(([x, y, c, a]) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, W * .75);
      rg.addColorStop(0, hexA(c, a)); rg.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    });

    marco(ctx, W, H);
    const yLogo = formato === 'story' ? 120 : 84;
    const hLogo = logo(ctx, W, yLogo, formato === 'story' ? 340 : 300);
    if(formato === 'story' && d.bajada){
      ctx.save(); ctx.textAlign = 'center'; ctx.font = '600 25px Poppins'; espaciado(ctx, 5);
      ctx.fillStyle = hexA(C.cream, .85);
      ctx.fillText(d.bajada.toUpperCase(), W / 2, yLogo + hLogo + 58);
      ctx.restore();
    }

    // Bloque de textos, de abajo hacia arriba
    const maxW = W - 220;
    let y = H - 92 - 30 - (formato === 'story' ? 70 : 54);
    if(d.link) pie(ctx, W, H, d.link);
    // separador
    ctx.fillStyle = espectro(ctx, W / 2 - 120, 0, W / 2 + 120, 0);
    ctx.fillRect(W / 2 - 120, y, 240, 4);
    y -= 44;

    if(d.titulo){
      ctx.save(); ctx.font = '500 37px Poppins'; ctx.textAlign = 'center'; ctx.fillStyle = hexA(C.cream, .92);
      const ls = recortar(ctx, renglones(ctx, d.titulo, maxW), 2, maxW);
      for(let i = ls.length - 1; i >= 0; i--){ ctx.fillText(ls[i], W / 2, y); y -= 50; }
      ctx.restore();
      y -= 22;
    }

    // Nombre: el más grande que entre en 2 renglones
    ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF';
    let tam = 132, ls;
    for(; tam >= 60; tam -= 4){
      ctx.font = '400 ' + tam + 'px "Protest Strike"';
      ls = renglones(ctx, (d.nombre || '').toUpperCase(), maxW);
      if(ls.length <= 2 && ls.every(l => ctx.measureText(l).width <= maxW)) break;
    }
    ls = recortar(ctx, ls, 2, maxW);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24;
    for(let i = ls.length - 1; i >= 0; i--){ ctx.fillText(ls[i], W / 2, y); y -= tam * 1.02; }
    ctx.restore();
    y -= 26 - tam * .22;

    if(d.etiqueta) pastilla(ctx, W / 2, y - 52, d.etiqueta, d.color || C.red, d.etiquetaOscura);
    return canvas;
  }

  /* ===================== Lineup (lista de nombres) ===================== */
  function cabecera(ctx, W, d){
    logo(ctx, W, 86, 270);
    ctx.save(); ctx.textAlign = 'center';
    ctx.font = '600 26px Poppins'; espaciado(ctx, 6); ctx.fillStyle = C.teal;
    ctx.fillText((d.eyebrow || '').toUpperCase(), W / 2, 285);
    espaciado(ctx, 0);
    ctx.font = '400 82px "Protest Strike"'; ctx.fillStyle = C.cream;
    const ls = recortar(ctx, renglones(ctx, d.titulo || '', W - 220), 2, W - 220);
    let y = 375;
    ls.forEach(l => { ctx.fillText(l, W / 2, y); y += 84; });
    ctx.restore();
    y -= 30;
    ctx.fillStyle = espectro(ctx, W / 2 - 110, 0, W / 2 + 110, 0);
    ctx.fillRect(W / 2 - 110, y, 220, 4);
    return y + 40;
  }

  function lineup(canvas, d){
    const { w: W, h: H } = FORMATOS.post;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    fondoAurora(ctx, W, H);
    if(imgs.iso){ const s = W * .9; ctx.globalAlpha = .05; ctx.drawImage(imgs.iso, (W - s) / 2, H * .22, s, s * imgs.iso.naturalHeight / imgs.iso.naturalWidth); ctx.globalAlpha = 1; }
    marco(ctx, W, H);
    const top = cabecera(ctx, W, d);
    const bottom = H - 170, maxW = W - 200;
    const items = d.items || [];
    const sep = '  ·  ';

    // Tamaño de letra más grande con el que entran todos los nombres
    let tam = 66, lineas = [];
    for(; tam >= 22; tam -= 2){
      ctx.font = '700 ' + tam + 'px Poppins';
      lineas = []; let actual = [];
      items.forEach(n => {
        const prueba = actual.concat(n).join(sep);
        if(ctx.measureText(prueba).width <= maxW || !actual.length) actual.push(n);
        else { lineas.push(actual); actual = [n]; }
      });
      if(actual.length) lineas.push(actual);
      if(lineas.length * tam * 1.32 <= bottom - top) break;
    }
    const alto = lineas.length * tam * 1.32;
    let y = top + (bottom - top - alto) / 2 + tam;
    ctx.textBaseline = 'alphabetic';
    lineas.forEach(fila => {
      const texto = fila.join(sep);
      let x = (W - ctx.measureText(texto).width) / 2;
      fila.forEach((n, i) => {
        const w = ctx.measureText(n).width;
        const esYo = d.destacado && n === d.destacado;
        ctx.fillStyle = esYo ? espectro(ctx, x, 0, x + w, 0) : C.cream;
        ctx.fillText(n, x, y);
        x += w;
        if(i < fila.length - 1){ ctx.fillStyle = hexA(C.cream, .45); ctx.fillText(sep, x, y); x += ctx.measureText(sep).width; }
      });
      y += tam * 1.32;
    });
    if(d.pie) pie(ctx, W, H, d.pie);
    return canvas;
  }

  /* ===================== Agenda ===================== */
  function agenda(canvas, d){
    const { w: W, h: H } = FORMATOS.post;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    fondoAurora(ctx, W, H);
    marco(ctx, W, H);
    const top = cabecera(ctx, W, d);
    const evs = (d.eventos || []).slice(0, 7);
    const bottom = H - 170, x0 = 110;
    const filaH = Math.min(evs.length <= 3 ? 190 : 150, (bottom - top) / Math.max(evs.length, 1));
    let y = top + (bottom - top - filaH * evs.length) / 2;
    evs.forEach(e => {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      rr(ctx, x0, y + 10, filaH * 1.05, filaH - 20, 20); ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = C.amber;
      ctx.font = '800 ' + Math.round(filaH * .34) + 'px Poppins';
      ctx.fillText(e.dia, x0 + filaH * .525, y + filaH * .55);
      ctx.font = '700 ' + Math.round(filaH * .17) + 'px Poppins'; espaciado(ctx, 3);
      ctx.fillStyle = C.cream; ctx.fillText(e.mes.toUpperCase(), x0 + filaH * .525, y + filaH * .78);
      ctx.restore();
      const tx = x0 + filaH * 1.05 + 34, maxW = W - 110 - tx;
      ctx.save(); ctx.textAlign = 'left';
      ctx.font = '700 ' + Math.round(Math.min(filaH * .27, 44)) + 'px Poppins'; ctx.fillStyle = C.cream;
      ctx.fillText(recortar(ctx, [e.titulo], 1, maxW)[0], tx, y + filaH * .5);
      ctx.font = '500 ' + Math.round(Math.min(filaH * .19, 30)) + 'px Poppins'; ctx.fillStyle = C.soft;
      if(e.lugar) ctx.fillText(recortar(ctx, [e.lugar], 1, maxW)[0], tx, y + filaH * .76);
      ctx.restore();
      y += filaH;
    });
    if(d.pie) pie(ctx, W, H, d.pie);
    return canvas;
  }

  /* Descarga el canvas como JPG. En el celular, si se puede, abre el menú de
     compartir del sistema (desde ahí se guarda directo en la galería). */
  function descargar(canvas, nombre){
    return new Promise(res => canvas.toBlob(async blob => {
      if(!blob){ res(false); return; }
      const archivo = new File([blob], nombre, { type: 'image/jpeg' });
      const movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if(movil && navigator.canShare && navigator.canShare({ files: [archivo] })){
        try{ await navigator.share({ files: [archivo] }); res(true); return; }
        catch(e){ if(e && e.name === 'AbortError'){ res(false); return; } }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      res(true);
    }, 'image/jpeg', .92));
  }

  return { FORMATOS, preparar, cargarImg, cubrir, perfil, lineup, agenda, descargar };
})();
