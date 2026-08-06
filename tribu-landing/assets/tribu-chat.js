/* ============================================================
   TRIBU CONNECTION — Botones flotantes
   1) WhatsApp directo (abajo)
   2) "Tri", el asistente de la Tribu (arriba): responde con la
      info real del sitio y lleva a la sección que corresponde.

   Se auto-inyecta: alcanza con <script defer src="/assets/tribu-chat.js?v=N">
   en cualquier página. Los estilos viven en tribu.css (bloque FLOTANTES).
   ============================================================ */
(function () {
  'use strict';

  /* ── Configuración editable ─────────────────────────────── */
  const WA_NUMERO = '5491155031180';                 // Andrés — formato internacional, sin + ni espacios
  const WA_TEXTO  = 'Hola Tribu Connection 👋 Me gustaría saber más.';
  const BOT_NOMBRE = 'Tri';
  const LOGO = '/assets/isotipo.png?v=2';

  /* ── Base de conocimiento ───────────────────────────────────
     Cada entrada: kw (disparadores), go (a dónde lleva la web),
     html (respuesta), chips (siguientes preguntas), cta (botón opcional).
     Para agregar un tema nuevo, copiá un bloque y listo. */
  const KB = [
    {
      id: 'que-es',
      kw: ['que es tribu', 'que es la tribu', 'que hacen', 'a que se dedican', 'de que se trata',
           'sobre tribu', 'quienes son', 'contame', 'cuentame', 'tribu connection', 'informacion'],
      go: '/#nosotros',
      chips: ['¿Cómo pueden ayudarme?', '¿Qué es el Club?', 'Ver historias reales'],
      html: `<p><strong>Tribu Connection</strong> es un <strong>punto de encuentro</strong> entre personas que buscan experiencias y comunidades que tienen algo para compartir.</p>
<ul>
<li>Descubrimos <strong>experiencias</strong> y las acercamos a quien las busca</li>
<li>Contamos <strong>historias reales</strong> de festivales, marcas y proyectos</li>
<li>Acompañamos a que cada propuesta <strong>llegue a más personas</strong></li>
</ul>`
    },
    {
      id: 'caminos',
      kw: ['como pueden ayudarme', 'como me ayudan', 'que ofrecen', 'servicios', 'caminos',
           'como trabajan', 'como funciona', 'que puedo hacer', 'opciones', 'ayuda'],
      go: '/#caminos',
      chips: ['Organizo un evento', 'Tengo una marca', '¿Qué es el Club?'],
      html: `<p>La Tribu se construye desde <strong>tres lugares distintos</strong>. Elegí el que te representa:</p>
<ul>
<li><strong>Creás</strong> — experiencias, eventos, arte o encuentros</li>
<li><strong>Impulsás</strong> — una marca, un emprendimiento o una organización</li>
<li><strong>Buscás</strong> — descubrir experiencias, conectar y acceder a beneficios</li>
</ul>
<p><em>Contanos desde dónde venís y te mostramos, en detalle, cómo podemos acompañarte.</em></p>`
    },
    {
      id: 'creadores',
      kw: ['organizo', 'organizador', 'organizadora', 'evento', 'eventos', 'festival', 'festivales',
           'encuentro', 'taller', 'talleres', 'ciclo', 'productora', 'facilitador', 'facilitadora',
           'cobertura', 'difusion', 'difundir', 'mi proyecto', 'experiencia que organizo'],
      go: '/organizas-experiencias/#ayuda',
      chips: ['¿Cómo es la cobertura?', '¿Cuánto cuesta?', 'Quiero contarles mi proyecto'],
      cta: { label: 'Contarles mi proyecto', action: 'connect', perfil: 'Creador/a de experiencias' },
      html: `<p>Si tu propuesta reúne personas, te acompañamos <strong>en cada etapa</strong>:</p>
<ul>
<li><strong>Antes</strong> — difusión, sorteos y entrevistas</li>
<li><strong>Durante</strong> — cobertura en foto, video y testimonios</li>
<li><strong>Después</strong> — reels, nota y análisis de resultados</li>
</ul>
<p><em>Tu experiencia merece ser vista y elegida.</em></p>`
    },
    {
      id: 'marcas',
      kw: ['marca', 'marcas', 'emprendimiento', 'emprendedor', 'emprendedora', 'negocio', 'empresa',
           'organizacion', 'publicidad', 'colaboracion', 'colaboraciones', 'activacion', 'activaciones',
           'canje', 'auspicio', 'sponsor', 'patrocinio', 'branding'],
      go: '/representas-marca/#ayuda',
      chips: ['¿Qué historias contaron?', '¿Cómo empezamos?', 'Ver los caminos'],
      cta: { label: 'Contarles de mi marca', action: 'connect', perfil: 'Marca / emprendimiento' },
      html: `<p>Llevamos la esencia de tu marca a <strong>experiencias que generan conexión</strong> en comunidades afines.</p>
<ul>
<li><strong>Comprendemos</strong> — tu propósito y tu comunidad</li>
<li><strong>Creamos</strong> — contenidos, activaciones y colaboraciones</li>
<li><strong>Conectamos</strong> — donde ya hay afinidad real</li>
</ul>
<p>Ya contamos las historias de <strong>Sagrada Madre</strong>, <strong>Hawka</strong> y <strong>Unifungi</strong>.</p>`
    },
    {
      id: 'club',
      kw: ['club', 'membresia', 'miembro', 'socio', 'sumarme', 'sumarse', 'tribu pass', 'pass',
           'beneficios', 'descuentos', 'beneficio', 'cafecito', 'tribu plus', 'comunidad de whatsapp'],
      go: '/club-tribu-connection/#planes',
      chips: ['¿Cuánto sale el Club?', '¿Qué beneficios tiene?', 'Quiero sumarme'],
      html: `<p>El <strong>Club Tribu Connection</strong> es una membresía mensual con beneficios en todo el ecosistema consciente.</p>
<ul>
<li><strong>Cafecito</strong> — desde $5.000 por pedido: tu evento en el calendario y difusión</li>
<li><strong>Tribu Plus</strong> — $20.000 por mes: landing propia, comunidad de WhatsApp, notas, sorteos y eventos para miembros</li>
</ul>`
    },
    {
      id: 'precios',
      kw: ['precio', 'precios', 'cuanto sale', 'cuanto cuesta', 'costo', 'costos', 'valor', 'tarifa',
           'presupuesto', 'cotizacion', 'plan', 'planes', 'pagar', 'cuota', 'inversion'],
      go: '/club-tribu-connection/#planes',
      chips: ['¿Qué incluye Tribu Plus?', 'Organizo un evento', 'Hablar con una persona'],
      html: `<p>Depende de por dónde entres a la Tribu:</p>
<ul>
<li><strong>Club</strong> — <strong>Cafecito</strong> desde $5.000 y <strong>Tribu Plus</strong> a $20.000 por mes</li>
<li><strong>Proyectos y marcas</strong> — <strong>propuesta a medida</strong> según lo que necesites</li>
</ul>
<p><em>Contanos tu caso, sin compromiso.</em></p>`
    },
    {
      id: 'historias',
      kw: ['historias', 'historia', 'reels', 'reel', 'videos', 'video', 'contenido', 'casos',
           'ejemplos', 'trabajos', 'portfolio', 'instagram', 'redes', 'tiktok', 'youtube'],
      go: '/#historias',
      chips: ['¿Cómo es la cobertura?', '¿Qué números tienen?', 'Ver los caminos'],
      html: `<p>En <strong>Historias reales</strong> está lo que sucede al encontrarnos:</p>
<ul>
<li><strong>Resonar 2026</strong> — el repaso del festival</li>
<li><strong>Conciencia Festival</strong> — cobertura de campaña</li>
<li><strong>Entrevistas en vivo</strong> — las voces de cada evento</li>
<li><strong>Música en vivo</strong> — lo que conecta a la comunidad</li>
</ul>
<p><em>Cada tarjeta abre el reel en Instagram.</em></p>`
    },
    {
      id: 'agenda',
      kw: ['agenda', 'calendario', 'proximos eventos', 'que eventos hay', 'cuando', 'fechas',
           'cartelera', 'mapa', 'que hay cerca', 'donde'],
      go: '/#calendario',
      chips: ['Quiero sumar mi evento', '¿Qué es el Club?', 'Ver historias reales'],
      html: `<p>En la <strong>agenda</strong> están los próximos destinos de la Tribu: festivales, encuentros y propuestas con propósito.</p>
<ul>
<li>Podés verla en <strong>calendario</strong> o en <strong>mapa</strong></li>
<li>Filtrás por tipo de experiencia</li>
<li>Y podés <strong>sumar la tuya</strong> para que más personas la descubran</li>
</ul>`
    },
    {
      id: 'sumar-evento',
      kw: ['sumar mi evento', 'agregar mi evento', 'publicar mi evento', 'cargar evento',
           'quiero aparecer en la agenda', 'sumar evento', 'agregar evento'],
      go: '/#calendario',
      chips: ['¿Cuánto cuesta?', '¿Qué es el Club?'],
      cta: { label: 'Cargar mi evento', action: 'evento' },
      html: `<p>¡Buenísimo! Podés <strong>sumar tu evento</strong> a la agenda de la Tribu desde el botón <em>"Solicitar agregar evento"</em>.</p>
<p>Nos contás <strong>qué es, cuándo y dónde</strong>, lo revisamos y te confirmamos por WhatsApp o mail.</p>`
    },
    {
      id: 'numeros',
      kw: ['numeros', 'alcance', 'metricas', 'estadisticas', 'seguidores', 'audiencia', 'resultados',
           'senales', 'cuanta gente', 'comunidad tienen'],
      go: '/#senales',
      chips: ['Ver historias reales', 'Tengo una marca', '¿Cómo pueden ayudarme?'],
      html: `<p>Estas son <strong>las señales</strong> de la comunidad hoy:</p>
<ul>
<li><strong>205.200</strong> cuentas alcanzadas en Instagram</li>
<li><strong>288K</strong> vistas en Reels</li>
<li><strong>4.123</strong> seguidores en Instagram (+28,7% en el mes)</li>
<li><strong>2.219</strong> visitas al perfil en el último mes</li>
</ul>
<p><em>Números de una comunidad que crece por afinidad, no por alcance comprado.</em></p>`
    },
    {
      id: 'desafios',
      kw: ['desafio', 'desafios', 'problema', 'problemas', 'visibilidad', 'no me conocen',
           'poca gente', 'no llega', 'crecer', 'por que los necesito'],
      go: '/#problema',
      chips: ['¿Cómo pueden ayudarme?', 'Organizo un evento', 'Tengo una marca'],
      html: `<p>Si estás llevando adelante un proyecto, probablemente conozcas estos tres:</p>
<ul>
<li><strong>Visibilidad</strong> — el desafío no es la calidad de tu propuesta, sino que todavía no saben que existe</li>
<li><strong>Conexión</strong> — no alcanza con mostrarse: las personas necesitan conectar con tu historia</li>
<li><strong>Comunidad</strong> — cuando aparece un propósito compartido, dejan de mirar de afuera y construyen con vos</li>
</ul>`
    },
    {
      id: 'contacto',
      kw: ['contacto', 'contactar', 'hablar', 'escribir', 'mail', 'email', 'correo', 'telefono',
           'whatsapp', 'llamar', 'reunion', 'agendar', 'consulta', 'persona', 'humano', 'asesor'],
      go: '/#contacto',
      chips: ['¿Cómo pueden ayudarme?', '¿Qué es el Club?'],
      cta: { label: 'Escribir por WhatsApp', action: 'wa' },
      html: `<p>Nos podés escribir por donde te quede más cómodo:</p>
<ul>
<li><strong>WhatsApp</strong> — respuesta directa, es el camino más rápido</li>
<li><strong>Mail</strong> — contacto@tribuconnection.com</li>
<li><strong>Formulario</strong> — dejás tus datos y te escribimos con una propuesta</li>
</ul>
<p><em>Te respondemos a la brevedad.</em></p>`
    },
    {
      id: 'gracias',
      kw: ['gracias', 'buenisimo', 'genial', 'perfecto', 'ok gracias', 'muchas gracias'],
      go: null,
      chips: ['¿Cómo pueden ayudarme?', '¿Qué es el Club?', 'Hablar con una persona'],
      html: `<p>¡De nada! 🌟 Si te queda alguna duda, estoy acá.</p>`
    }
  ];

  const CHIPS_INICIALES = [
    '¿Qué es Tribu Connection?',
    '¿Cómo pueden ayudarme?',
    '¿Qué es el Club?',
    'Ver la agenda',
    '¿Cuánto cuesta?'
  ];

  /* Saludos: se responden aparte para no disparar una ficha entera. */
  const SALUDOS = ['hola', 'holis', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches', 'hey', 'que tal'];

  /* Etiqueta del botón cuando el tema vive en otra página del sitio */
  const DESTINOS = {
    '/': 'Ir al inicio →',
    '/club-tribu-connection/': 'Ver el Club Tribu Connection →',
    '/organizas-experiencias/': 'Ver cómo acompañamos tu proyecto →',
    '/representas-marca/': 'Ver la propuesta para marcas →'
  };

  /* ── Utilidades ─────────────────────────────────────────── */
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const esc  = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Matcheo por puntaje: gana el tema con más señales, y entre iguales
     el keyword más largo (más específico) manda. Así "cuánto sale el club"
     cae en Club y no en Precios genérico. */
  function buscar(texto) {
    const t = ' ' + norm(texto) + ' ';
    let mejor = null, mejorPuntaje = 0;
    for (const entry of KB) {
      let puntaje = 0;
      for (const kw of entry.kw) {
        const k = norm(kw);
        if (!k) continue;
        if (t.includes(' ' + k + ' ') || t.includes(' ' + k) && k.length > 4) {
          puntaje += k.length + (k.includes(' ') ? 6 : 0);
        }
      }
      if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = entry; }
    }
    return mejorPuntaje >= 4 ? mejor : null;
  }

  function esSaludo(texto) {
    const t = norm(texto);
    return t.length <= 22 && SALUDOS.some(s => t === s || t.startsWith(s + ' ') || t === s + '!');
  }

  /* ¿El destino está en la página que estoy viendo ahora? */
  function esAca(destino) {
    if (!destino) return false;
    const [ruta, hash] = destino.split('#');
    const aca  = location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
    const alla = (ruta || '/').replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
    return aca === alla && (!hash || !!document.getElementById(hash));
  }

  /* Scroll suave a la sección de esta misma página (el offset del nav lo
     resuelve el scroll-margin-top de tribu.css). */
  function scrollAca(destino) {
    const hash = destino.split('#')[1];
    const el = hash ? document.getElementById(hash) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const waHref = (texto) => 'https://wa.me/' + WA_NUMERO + '?text=' + encodeURIComponent(texto || WA_TEXTO);

  /* ── Markup ─────────────────────────────────────────────── */
  const dock = document.createElement('div');
  dock.className = 'tc-dock';
  dock.innerHTML =
    '<div class="tc-panel" id="tcPanel" hidden>' +
      '<div class="tc-head">' +
        '<div class="tc-head-info">' +
          '<span class="tc-avatar"><img src="' + LOGO + '" alt=""></span>' +
          '<span class="tc-head-txt">' +
            '<span class="tc-name">' + BOT_NOMBRE + ' · Tribu Connection</span>' +
            '<span class="tc-status">En línea ahora</span>' +
          '</span>' +
        '</div>' +
        '<button class="tc-close" type="button" aria-label="Cerrar el chat">✕</button>' +
      '</div>' +
      '<div class="tc-msgs" id="tcMsgs" role="log" aria-live="polite"></div>' +
      '<div class="tc-chips" id="tcChips"></div>' +
      '<div class="tc-bar">' +
        '<input class="tc-input" id="tcInput" type="text" autocomplete="off" placeholder="Preguntame sobre la Tribu…" aria-label="Escribí tu pregunta">' +
        '<button class="tc-send" type="button" aria-label="Enviar">↑</button>' +
      '</div>' +
      '<div class="tc-foot"><button class="tc-human" type="button">Hablar con una persona →</button></div>' +
    '</div>' +
    '<button class="tc-fab" type="button" aria-label="Abrir el asistente de la Tribu" aria-expanded="false">' +
      '<span class="tc-dot"></span>' +
      '<img src="' + LOGO + '" alt="">' +
    '</button>';

  const wa = document.createElement('a');
  wa.className = 'tc-wa';
  wa.href = waHref();
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'Escribinos por WhatsApp');
  wa.title = 'Escribinos por WhatsApp';
  wa.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  document.body.appendChild(wa);
  document.body.appendChild(dock);

  const panel = dock.querySelector('.tc-panel');
  const fab   = dock.querySelector('.tc-fab');
  const msgs  = dock.querySelector('.tc-msgs');
  const chips = dock.querySelector('.tc-chips');
  const input = dock.querySelector('.tc-input');

  /* ── Render ─────────────────────────────────────────────── */
  /* El scroll se acomoda en el frame siguiente: si se pide en el mismo tick
     del appendChild, el alto todavía no está calculado y queda a mitad de
     camino (el botón del final de una respuesta larga quedaba tapado). */
  function alFinal() {
    requestAnimationFrame(() => {
      const ult = msgs.lastElementChild;
      /* Respuesta más alta que el panel: la alineamos arriba para poder leerla
         desde el principio, en vez de aterrizar en el final. */
      if (ult && ult.offsetHeight > msgs.clientHeight - 24) msgs.scrollTop = ult.offsetTop - 8;
      else msgs.scrollTop = msgs.scrollHeight;
      marcarSiHayMas();
    });
  }

  /* Avisa (con un degradado al pie) que la respuesta sigue más abajo */
  function marcarSiHayMas() {
    const hay = msgs.scrollTop + msgs.clientHeight < msgs.scrollHeight - 4;
    panel.classList.toggle('tc-more', hay);
  }

  function addMsg(html, role) {
    const div = document.createElement('div');
    div.className = 'tc-msg ' + role;
    div.innerHTML = html;
    msgs.appendChild(div);
    alFinal();
    guardar();
    return div;
  }

  function typing() {
    const d = document.createElement('div');
    d.className = 'tc-msg bot tc-typing-wrap';
    d.innerHTML = '<span class="tc-typing"><i></i><i></i><i></i></span>';
    msgs.appendChild(d);
    alFinal();
    return d;
  }

  let chipsActuales = [];
  function setChips(lista) {
    chipsActuales = lista || [];
    chips.innerHTML = '';
    chipsActuales.forEach(label => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tc-chip';
      b.textContent = label;
      b.addEventListener('click', () => enviar(label));
      chips.appendChild(b);
    });
    guardar();
  }

  /* ── Memoria de la charla ────────────────────────────────
     El sitio son páginas separadas: sin esto, cada vez que el chat te
     manda a otra sección se perdería todo lo conversado. */
  const CLAVE = 'tc-chat-v1';
  let listo = false;
  let scrollGuardado = 0;   // dónde estaba leyendo la persona al minimizar
  function guardar() {
    if (!listo) return;
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify({
        abierto: abierto, html: msgs.innerHTML, chips: chipsActuales,
        scroll: abierto ? msgs.scrollTop : scrollGuardado
      }));
    } catch (e) { /* modo privado / storage lleno: seguimos sin memoria */ }
  }
  function recordado() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; }
  }

  /* Acciones de los botones que aparecen dentro de una respuesta.
     Van por delegación (data-act) para que sigan funcionando cuando la
     conversación se restaura después de cambiar de página. */
  function ejecutar(act, el) {
    if (act === 'wa')   { window.open(waHref(), '_blank', 'noopener'); return; }
    if (act === 'link') { guardar(); location.href = el.dataset.href; return; }
    if (act === 'evento') {
      const btn = document.getElementById('calAdd');
      if (btn) { cerrar(); btn.click(); } else { guardar(); location.href = '/#calendario'; }
      return;
    }
    if (act === 'connect') {
      const btn = document.querySelector('[data-connect]') || document.querySelector('[data-join]');
      if (btn) {
        cerrar();
        if (el.dataset.perfil) btn.dataset.perfil = el.dataset.perfil;
        btn.click();
      } else {
        guardar();
        location.href = '/#contacto';
      }
    }
  }

  function botonCta(label, act, extra) {
    const b = document.createElement('button');
    b.type = 'button';
    /* El botón que sólo navega va en secundario: el primario es el que
       arranca una conversación con el equipo. */
    b.className = 'tc-cta' + (act === 'link' ? ' tc-cta--ghost' : '');
    b.textContent = label;
    b.dataset.act = act;
    Object.assign(b.dataset, extra || {});
    return b;
  }

  function responder(texto) {
    const t = msgs.querySelector('.tc-typing-wrap');
    if (t) t.remove();

    if (esSaludo(texto)) {
      addMsg('<p>¡Hola! 👋 Contame qué te trae por acá y te oriento.</p>', 'bot');
      setChips(CHIPS_INICIALES);
      return;
    }

    const match = buscar(texto);

    if (!match) {
      addMsg('<p>De eso no tengo la respuesta a mano 🙈, pero seguro te la damos nosotros: podés <strong>escribirnos por WhatsApp</strong> o dejarnos tus datos.</p>' +
             '<p>También puedo contarte sobre <em>qué hacemos, el Club, la agenda, las historias o los precios</em>.</p>', 'bot');
      setChips(CHIPS_INICIALES);
      return;
    }

    const div = addMsg(match.html, 'bot');

    if (match.cta) {
      div.appendChild(botonCta(match.cta.label, match.cta.action, {
        href: match.cta.href || '', perfil: match.cta.perfil || ''
      }));
    }

    /* Y lo llevamos a la parte del sitio donde se habla de ese tema.
       Si está en esta misma página, scrolleamos solos. Si está en otra,
       ofrecemos el salto en un botón: navegar de prepo cortaría la charla. */
    if (match.go) {
      const hint = document.createElement('div');
      hint.className = 'tc-hint';
      div.appendChild(hint);
      if (esAca(match.go)) {
        hint.textContent = '↓ Te llevo a esa parte de la web…';
        setTimeout(() => {
          scrollAca(match.go);
          hint.textContent = '✦ Listo, lo tenés abierto acá abajo';
          guardar();
        }, 900);
      } else {
        hint.textContent = '✦ Eso lo contamos en detalle acá';
        div.appendChild(botonCta(DESTINOS[match.go.split('#')[0]] || 'Ver esa sección →', 'link', { href: match.go }));
      }
      alFinal();
    }

    setChips(match.chips || CHIPS_INICIALES);
  }

  function enviar(texto) {
    const t = (texto || '').trim();
    if (!t) return;
    addMsg('<p>' + esc(t) + '</p>', 'user');
    input.value = '';
    setChips([]);
    typing();
    setTimeout(() => responder(t), 650 + Math.random() * 400);
  }

  /* ── Abrir / cerrar ─────────────────────────────────────── */
  let abierto = false;

  function abrir(foco) {
    const retoma = msgs.children.length > 0;
    abierto = true;
    panel.hidden = false;
    fab.classList.add('is-open');
    fab.classList.remove('tc-pendiente');
    fab.setAttribute('aria-expanded', 'true');
    if (!retoma) {
      setTimeout(() => {
        addMsg('<p>¡Hola! Soy <strong>' + BOT_NOMBRE + '</strong>, el asistente de <strong>Tribu Connection</strong> 👋</p><p>¿Sobre qué te puedo contar?</p>', 'bot');
        setChips(CHIPS_INICIALES);
      }, 250);
    }
    /* Si vuelve a una charla que ya existía, la retomamos en el mismo punto
       en el que la dejó, no al final. */
    if (retoma) {
      /* Dos pasadas: al restaurar la charla en otra página el alto real recién
         existe cuando terminaron de acomodarse tipografías e imágenes, y una
         sola asignación se recorta a 0. */
      const volverAlPunto = () => { msgs.scrollTop = scrollGuardado; marcarSiHayMas(); };
      requestAnimationFrame(volverAlPunto);
      setTimeout(volverAlPunto, 220);
    } else alFinal();
    guardar();
    if (foco !== false) setTimeout(() => input.focus({ preventScroll: true }), 300);
  }

  function cerrar() {
    if (abierto) scrollGuardado = msgs.scrollTop;
    abierto = false;
    panel.hidden = true;
    fab.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    marcarPendiente();
    guardar();
  }

  /* Con una charla minimizada el círculo queda encendido: avisa que ahí atrás
     hay algo empezado y que el click lo retoma. */
  function marcarPendiente() {
    fab.classList.toggle('tc-pendiente', !abierto && msgs.children.length > 0);
    fab.setAttribute('aria-label', (!abierto && msgs.children.length)
      ? 'Retomar la charla con el asistente de la Tribu'
      : 'Abrir el asistente de la Tribu');
  }

  fab.addEventListener('click', () => abierto ? cerrar() : abrir());
  dock.querySelector('.tc-close').addEventListener('click', cerrar);
  dock.querySelector('.tc-send').addEventListener('click', () => enviar(input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') enviar(input.value); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && abierto) cerrar(); });
  dock.querySelector('.tc-human').addEventListener('click', () => window.open(waHref(), '_blank', 'noopener'));
  /* Delegación: vale tanto para los botones recién creados como para los
     que vuelven del historial guardado. */
  msgs.addEventListener('click', e => {
    const b = e.target.closest('.tc-cta');
    if (b) ejecutar(b.dataset.act, b);
  });
  msgs.addEventListener('scroll', marcarSiHayMas, { passive: true });

  /* Si la persona vuelve a usar la web con el chat abierto (toca un link, una
     tarjeta, el menú), lo minimizamos solo para no taparle la pantalla. La charla
     queda intacta: al tocar el círculo vuelve tal cual estaba, en el mismo punto.
     Va en captura y con pointerdown para alcanzar a guardar el estado incluso
     cuando ese click dispara una navegación. */
  document.addEventListener('pointerdown', e => {
    if (!abierto) return;
    if (e.target.closest('.tc-dock') || e.target.closest('.tc-wa')) return;
    cerrar();
  }, true);

  /* ── Restaurar la charla anterior (si la hay) ───────────── */
  const previo = recordado();
  listo = true;
  if (previo && previo.html) {
    msgs.innerHTML = previo.html;
    msgs.querySelectorAll('.tc-typing-wrap').forEach(n => n.remove());
    scrollGuardado = previo.scroll || 0;
    setChips(previo.chips);
    if (previo.abierto) abrir(false); else marcarPendiente();
  }

  /* La barra de cookies ocupa el pie de la pantalla: mientras esté visible,
     los botones flotantes suben para no quedar encima. */
  const cookieBar = document.querySelector('.cookie-bar');
  if (cookieBar) {
    const sync = () => {
      const visible = cookieBar.classList.contains('show');
      /* Medimos la barra real: cambia de alto según el ancho de pantalla */
      document.body.style.setProperty('--tc-lift', visible ? Math.round(cookieBar.offsetHeight) + 'px' : '0px');
      document.body.classList.toggle('tc-lift', visible);
    };
    if (window.MutationObserver) {
      new MutationObserver(sync).observe(cookieBar, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }
})();
