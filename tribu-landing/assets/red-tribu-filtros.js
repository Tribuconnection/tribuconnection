/* Catálogo de los cinco filtros de la Red Tribu (Creador/a, Comunidad,
   Experiencia, Marca y Lugar).

   Sale de dos fuentes, y cuando se contradicen manda la última: los bocetos
   web de cada filtro (11/10/26) por encima del documento consolidado
   "Tribu_Connection_Cinco_Filtros_Catálogo_y_Guia_Multilingue". Por eso, por
   ejemplo, Comunidad tiene los 15 tipos del boceto y no los 12 que describe el
   texto, y los rangos de Integrantes son los del boceto.

   Cada opción tiene un `id` estable: lo que se guarda y lo que se compara es
   SIEMPRE el id, nunca la etiqueta visible. Las etiquetas viven en `es` y hay
   lugar para `en` / `pt` cuando diseño apruebe las traducciones (el documento
   las deja explícitamente pendientes), así agregar un idioma no obliga a
   migrar un solo perfil.

   Reglas de combinación: OR dentro de una sección, AND entre secciones. */

/* ---- Ámbitos: la macroclasificación que ordena las 195 prácticas ---- */
const TRIBU_AMBITOS = [
  { id:'bienestar',      es:'Bienestar' },
  { id:'movimiento',     es:'Movimiento y deporte' },
  { id:'artes',          es:'Artes y creatividad' },
  { id:'espiritualidad', es:'Espiritualidad y ritualidad' },
  { id:'musica',         es:'Música y sonido' },
  { id:'naturaleza',     es:'Naturaleza y regeneración' },
  { id:'comunicacion',   es:'Comunicación y producción' },
  { id:'gastronomia',    es:'Gastronomía' },
  { id:'entretenimiento',es:'Entretenimiento y eventos' },
  { id:'desarrollo',     es:'Desarrollo humano' }
];

/* ---- Las 195 prácticas, con el/los ámbitos a los que pertenecen ----
   Se conservan la denominación y el orden del catálogo original. "Desarrollo
   humano" no tiene capítulo propio: lo componen prácticas transversales que
   aparecen también en su capítulo de origen. */
const TRIBU_PRACTICAS = (() => {
  const G = {
    bienestar: ['Acupuntura','Aromaterapia','Ayurveda','Biodescodificación','Bioenergética','Constelaciones familiares','Flores de Bach','Masajes','Reflexología','Reiki','Respiración consciente / Breathwork','Sanación energética','Shiatsu','Sonoterapia','Terapias corporales'],
    espiritualidad: ['Astrología','Cacao ceremonial','Chamanismo','Coaching personal','Diseño Humano','Escritura introspectiva','Hipnosis','Meditación','Mindfulness','Numerología','Prácticas chamánicas','Registros akáshicos','Rituales y ceremonias ancestrales','Tarot / Oráculos','Visualización creativa','Círculos de palabra','Comunicación no violenta','Facilitación de encuentros','Tantra','Educación sexual integral','Exploración somática','Prácticas de consentimiento','Trabajo con masculinidades'],
    movimiento: ['Acroyoga','Animal Flow','Biodanza','Contact Improvisation','Danza contemporánea','Danza terapia','Danzas circulares','Danza tradicional / Folclórica','Ecstatic Dance','Expresión corporal','Movimiento consciente','Pilates','Qi Gong','Tai Chi','Yoga','Yoga infantil','Artes marciales','Calistenia','Ciclismo','Ciclismo de montaña / MTB','Escalada','Entrenamiento funcional','Entrenamiento personal','Karate','Natación','Pádel','Running','Senderismo deportivo','Skateboarding','Trekking','Vóley'],
    musica: ['Baños de gong','Canto','Canto de mantras','Círculos de canto','Composición musical','DJ sets','Handpan','Improvisación musical','Live looping','Música electrónica','Música en vivo','Percusión','Producción musical','Sound Healing','Terapia con cuencos'],
    artes: ['Actuación','Arte urbano','Arte terapia','Artes visuales','Cerámica','Circo y acrobacia','Dibujo','Escultura','Escritura creativa','Ilustración','Joyería artesanal','Pintura','Poesía','Teatro','Textiles y bordado','Artes de fuego','Acrobacia aérea','Zancos','Malabares','Clown','Teatro físico','Body painting','Arte visionario','Mapping audiovisual','Visuales en vivo / VJ','Land art','Instalaciones interactivas','Escenografía'],
    entretenimiento: ['Animación de eventos','Animación infantil','Conducción de eventos','Dinámicas participativas','Entretenimiento interactivo','Espectáculos circenses','Humor / Stand-up','Improvisación teatral','Juegos grupales','Magia e ilusionismo','Maestría de ceremonias','Organización de eventos','Producción de festivales','Recreación para adultos','Recreación y juegos infantiles','Cuentacuentos','Juego libre guiado','Educación lúdica','Circo infantil','Actividades intergeneracionales'],
    naturaleza: ['Agricultura regenerativa','Apicultura','Baños de bosque','Bioconstrucción','Botánica','Campismo','Conservación ambiental','Educación ambiental','Herbolaria','Huerta orgánica','Jardinería','Observación de aves','Permacultura','Plantas medicinales','Reciclaje y reutilización creativa','Agroforestería','Compostaje','Gestión sustentable del agua','Restauración ecológica','Construcción con bambú','Energías renovables'],
    gastronomia: ['Alimentación consciente','Cocina basada en plantas','Cocina de autor','Cocina saludable','Cocina tradicional','Coctelería sin alcohol','Elaboración de chocolate','Fermentación de alimentos','Gastronomía sustentable','Panadería artesanal','Pastelería artesanal','Preparación de infusiones','Raw food / Cocina viva','Té y ceremonias del té','Vegetarianismo y veganismo culinario'],
    comunicacion: ['Branding e identidad visual','Comunicación digital','Creación de contenidos','Diseño de experiencias','Diseño gráfico','Edición de video','Fotografía','Iluminación escénica','Locución','Marketing de experiencias','Oratoria','Producción audiovisual','Producción de podcasts','Producción técnica de eventos','Streaming y transmisiones en vivo','Divulgación científica','Astronomía','Filosofía','Antropología cultural','Cine documental','Arquitectura efímera','Diseño de espacios inmersivos','Montaje escenográfico','Accesibilidad en eventos','Interpretación en lengua de señas','Mediación intercultural','Acompañamiento de participantes']
  };
  /* Transversales: suman el ámbito "Desarrollo humano" sin dejar el suyo. */
  const TRANSVERSALES = ['Coaching personal','Comunicación no violenta','Facilitación de encuentros','Círculos de palabra','Escritura introspectiva','Oratoria','Acompañamiento de participantes','Exploración somática'];
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const out = [];
  Object.entries(G).forEach(([ambito, lista]) => lista.forEach(es => {
    const ambitos = [ambito];
    if(TRANSVERSALES.includes(es)) ambitos.push('desarrollo');
    out.push({ id:slug(es), es, ambitos });
  }));
  return out;
})();

/* Etiquetas que ya tienen cargadas los perfiles viejos (la lista corta de
   disciplinas anterior) y su práctica equivalente del catálogo nuevo. Sin
   esto, un perfil cargado antes dejaría de aparecer en los filtros. */
const TRIBU_PRACTICAS_ALIAS = {
  'Terapias holísticas':'sanacion_energetica', 'Sanación':'sanacion_energetica',
  'Breathwork':'respiracion_consciente_breathwork', 'Respiración consciente':'respiracion_consciente_breathwork',
  'Arte':'artes_visuales', 'Música':'musica_en_vivo', 'Danza':'danza_contemporanea',
  'Compositor / Productor musical':'produccion_musical',
  'Ceremonias':'rituales_y_ceremonias_ancestrales',
  'Coaching':'coaching_personal', 'Facilitación':'facilitacion_de_encuentros',
  'Sesiones individuales':'coaching_personal',
  'Eventos especiales':'organizacion_de_eventos', 'Talleres':'educacion_ludica'
};

/* Pasa una etiqueta guardada en un perfil al id de práctica del catálogo. */
function tribuPracticaId(etiqueta){
  if(!etiqueta) return null;
  if(TRIBU_PRACTICAS_ALIAS[etiqueta]) return TRIBU_PRACTICAS_ALIAS[etiqueta];
  const s = String(etiqueta).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return TRIBU_PRACTICAS.some(p => p.id === s) ? s : null;
}

/* Ayudante: arma opciones {id, es} a partir de una lista de etiquetas. */
function _ops(lista){
  return lista.map(es => ({
    id: es.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    es
  }));
}

const MODALIDAD_A = _ops(['Presencial', 'Online', 'Híbrido']);
const MODALIDAD_B = _ops(['Presencial', 'Online', 'Híbrida']);
const ALCANCE_5   = _ops(['Local', 'Regional', 'Nacional', 'Internacional', 'Global']);
const IDIOMAS_3   = _ops(['Español', 'Inglés', 'Portugués']);
const IDIOMAS_4   = _ops(['Español', 'Inglés', 'Portugués', 'Otro']);

/* Iconos de cada sección (los del boceto), por id de sección. */
const FILTRO_ICONOS = {
  persona:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  brujula:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  practica:'<circle cx="13" cy="4.5" r="2"/><path d="M8 21l3-6 3 2 1 4M5 11l4-3 4 1 4 3"/>',
  calendario:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  pantalla:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  avion:'<path d="M10 20h4l-1-6 8 2v-3l-8-4V4a2 2 0 0 0-4 0v5l-8 4v3l8-2z"/>',
  globo:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
  grupo:'<circle cx="12" cy="8" r="3"/><circle cx="5" cy="10.5" r="2.2"/><circle cx="19" cy="10.5" r="2.2"/><path d="M7 20a5 5 0 0 1 10 0M1.5 19.5a3.8 3.8 0 0 1 5-3.5M22.5 19.5a3.8 3.8 0 0 0-5-3.5"/>',
  corazon:'<path d="M12 20s-7-4.4-7-9.3A4 4 0 0 1 12 8a4 4 0 0 1 7 2.7C19 15.6 12 20 12 20z"/>',
  llave:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  brote:'<path d="M12 21v-7M12 14c0-4 3-7 8-7 0 4-3 7-8 7zM12 15c0-3-2.5-5.5-6.5-5.5C5.5 12.5 8 15 12 15z"/>',
  mano:'<circle cx="12" cy="9" r="3"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  nodos:'<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><circle cx="12" cy="6" r="2.5"/><path d="m10.6 8.2-3.2 6.6M13.4 8.2l3.2 6.6M8.5 17h7"/>',
  casa:'<path d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>',
  engranaje:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/>',
  reloj:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  puerta:'<rect x="6" y="3" width="12" height="18" rx="1.5"/><circle cx="14.5" cy="12" r="1"/>',
  accesibilidad:'<circle cx="12" cy="4.5" r="2"/><path d="M5 8h14M12 8v6M12 14l-3 7M12 14l3 7"/>',
  precio:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/>'
};

/* ---- Los cinco filtros ----
   type: 'chips' | 'lista' (casillas + buscador + scroll) | 'fecha' |
         'duracion' | 'dias'
   campo: de dónde sale el dato del perfil/ficha para comparar. */
const FILTROS_RED_TRIBU = {
  creador: {
    titulo:'Filtros de Creador/a', color:'#D97A88',
    secciones:[
      { id:'rol', titulo:'Rol', icono:'persona', type:'chips', campo:'rol',
        opciones:_ops(['Facilitador/a','Terapeuta','Guía / acompañante','Educador/a','Organizador/a','Productor/a','Artista','Prestador/a de servicios','Comunicador/a']) },
      { id:'ambitos', titulo:'Ámbitos', icono:'brujula', type:'chips', campo:'ambitos',
        buscador:'Buscar área o práctica…', filtraA:'practicas', opciones:TRIBU_AMBITOS },
      { id:'practicas', titulo:'Prácticas', icono:'practica', type:'lista', campo:'practicas',
        opciones:TRIBU_PRACTICAS },
      { id:'ofrece', titulo:'Qué ofrece', icono:'calendario', type:'chips', campo:'ofrece',
        opciones:_ops(['Sesión','Clase','Taller','Ceremonia','Consulta','Presentación / show','Experiencia grupal','Charla / formación','Servicios profesionales']) },
      { id:'modalidad', titulo:'Modalidad', icono:'pantalla', type:'chips', campo:'modalidad', opciones:MODALIDAD_A },
      { id:'movilidad', titulo:'Movilidad', icono:'avion', type:'chips', campo:'movilidad',
        opciones:_ops(['Puede viajar']) },
      { id:'idiomas', titulo:'Idiomas', icono:'chat', type:'chips', campo:'idiomas', opciones:IDIOMAS_3 }
    ],
    columnas:[['rol'], ['ambitos'], ['practicas'], ['ofrece'], ['modalidad', 'movilidad', 'idiomas']]
  },

  comunidad: {
    titulo:'Filtros de Comunidad', color:'#F4C76B',
    secciones:[
      { id:'tipo', titulo:'Tipo de comunidad', icono:'grupo', type:'chips', campo:'tipo',
        opciones:_ops(['Cultural / origen','Solidaria / voluntariado','Deportiva / movimiento','Bienestar y salud','Artística / creativa','Música y cultura festiva','Ambiental / sustentabilidad','Profesional / emprendedores','Educativa / aprendizaje','Familias y etapas de vida','Barrial / territorial','Recreativa / hobbies','Espiritual / filosófica','Apoyo mutuo','Digital / tecnológica']) },
      { id:'intereses', titulo:'Intereses / Temáticas', icono:'brote', type:'chips', campo:'intereses',
        opciones:_ops(['Arte y cultura','Deporte','Música y sonido','Naturaleza','Desarrollo personal','Espiritualidad','Gastronomía','Idiomas y culturas','Tecnología','Educación','Voluntariado','Salud y bienestar','Crianza y familia','Comunicación','Negocios e innovación','Sustentabilidad','Entretenimiento','Otros']) },
      { id:'proposito', titulo:'Propósito', icono:'corazon', type:'chips', campo:'proposito',
        opciones:_ops(['Conexión','Aprendizaje','Práctica regular','Acción social','Transformación','Intercambio cultural','Crecimiento profesional','Disfrute','Apoyo mutuo','Cuidado del ambiente','Otro']) },
      { id:'alcance', titulo:'Alcance', icono:'globo', type:'chips', campo:'alcance', opciones:ALCANCE_5 },
      { id:'modalidad', titulo:'Modalidad', icono:'calendario', type:'chips', campo:'modalidad', opciones:MODALIDAD_B },
      { id:'idiomas', titulo:'Idiomas', icono:'chat', type:'chips', campo:'idiomas', opciones:IDIOMAS_4 },
      { id:'integrantes', titulo:'Integrantes', icono:'grupo', type:'chips', campo:'integrantes',
        opciones:[{ id:'todos', es:'Todos' }, { id:'1_20', es:'1–20', min:1, max:20 }, { id:'21_50', es:'21–50', min:21, max:50 }, { id:'51_100', es:'51–100', min:51, max:100 }, { id:'101_500', es:'101–500', min:101, max:500 }, { id:'mas_500', es:'+500', min:501 }] },
      { id:'acceso', titulo:'Acceso', icono:'llave', type:'chips', campo:'acceso',
        opciones:_ops(['Abierta','Por aplicación','Membresía','Invitación']) }
    ],
    columnas:[['tipo'], ['intereses'], ['proposito'], ['alcance', 'modalidad', 'idiomas', 'integrantes', 'acceso']]
  },

  experiencia: {
    titulo:'Filtros de Experiencia', color:'#A99BC2',
    secciones:[
      { id:'tipo', titulo:'Tipo de experiencia', icono:'calendario', type:'chips', campo:'tipo',
        opciones:_ops(['Festival','Retiro','Taller / curso','Clase / práctica','Ceremonia','Concierto','Espectáculo','Obra de teatro','Cena show','Feria / exposición','Encuentro','Conferencia / charla','Visita guiada','Experiencia inmersiva','Actividad al aire libre','Evento deportivo','Tour / viaje','Otra']) },
      { id:'ambitos', titulo:'Ámbitos / Temáticas', icono:'brujula', type:'chips', campo:'ambitos',
        opciones:_ops(['Música y sonido','Arte y cultura','Bienestar','Naturaleza y medio ambiente','Espiritualidad','Desarrollo personal','Gastronomía','Deporte y movimiento','Educación','Infancias y familia','Ciencia y tecnología','Comunidad','Entretenimiento','Solidaria / impacto social','Negocios y networking','Otra']) },
      { id:'publico', titulo:'Público', icono:'grupo', type:'chips', campo:'publico',
        opciones:_ops(['Todas las edades','Infancias','Adolescentes','Adultos','Familias','Parejas','Solo para mujeres','Solo para hombres','Comunidad LGBTQ+','Profesionales','Abierto a todo público','Otro']) },
      { id:'precio', titulo:'Precio', icono:'precio', type:'chips', campo:'precio',
        opciones:[{ id:'gratuita', es:'Gratuita' }, { id:'de_pago', es:'De pago' }, { id:'hasta_10000', es:'Hasta $10.000', max:10000 }, { id:'10000_30000', es:'$10.000 – $30.000', min:10000, max:30000 }, { id:'30000_60000', es:'$30.000 – $60.000', min:30000, max:60000 }, { id:'mas_60000', es:'Más de $60.000', min:60000 }, { id:'otro', es:'Otro' }] },
      { id:'fecha', titulo:'Fecha', icono:'calendario', type:'fecha', campo:'fecha',
        rapidos:[{ id:'hoy', es:'Hoy' }, { id:'manana', es:'Mañana' }, { id:'finde', es:'Este fin de semana' }, { id:'prox_semana', es:'Próxima semana' }, { id:'este_mes', es:'Este mes' }] },
      { id:'duracion', titulo:'Duración (horas)', icono:'reloj', type:'duracion', campo:'duracion' },
      { id:'dias', titulo:'Cantidad de días', icono:'calendario', type:'dias', campo:'dias',
        opciones:[{ id:'hasta_1_dia', es:'Hasta 1 día' }, { id:'mas_de_1_dia', es:'Más de 1 día' }] },
      { id:'modalidad', titulo:'Modalidad', icono:'chat', type:'chips', campo:'modalidad', opciones:MODALIDAD_B },
      { id:'participacion', titulo:'Tipo de participación', icono:'grupo', type:'chips', campo:'participacion',
        opciones:_ops(['Individual','Grupal','Parejas','Familias','Con inscripción','Con reserva','Acceso libre','Invitación','Otro']) },
      { id:'idiomas', titulo:'Idiomas', icono:'chat', type:'chips', campo:'idiomas',
        opciones:_ops(['Español','Inglés','Portugués','Otros']) }
    ],
    columnas:[['tipo'], ['ambitos'], ['publico', 'precio'], ['fecha', 'duracion', 'dias'], ['modalidad', 'participacion', 'idiomas']]
  },

  marca: {
    titulo:'Filtros de Marca', color:'#63C2CA',
    secciones:[
      { id:'rubros', titulo:'Ámbitos / Rubros', icono:'brote', type:'lista', campo:'rubros',
        buscador:'Buscar rubro…',
        opciones:_ops(['Bienestar y cuidado personal','Alimentación y bebidas','Indumentaria y accesorios','Diseño, arte y objetos','Sustentabilidad y regeneración','Producción de eventos','Comunicación y marketing','Tecnología y plataformas','Espiritualidad y rituales','Deporte, movimiento y aventura','Turismo y viajes','Infancias y familias','Educación y formación','Servicios profesionales y empresariales','Música e industria cultural','Naturaleza y producción agroecológica','Impacto social y organizaciones','Comercio y distribución']) },
      { id:'ofrece', titulo:'Qué ofrece', icono:'mano', type:'chips', campo:'ofrece',
        opciones:_ops(['Productos','Servicios','Equipamiento','Tecnología','Recursos / insumos','Distribución','Patrocinios','Otro']) },
      { id:'propuesta', titulo:'Tipo de propuesta comercial', icono:'nodos', type:'chips', campo:'propuesta',
        opciones:_ops(['Venta directa al público','Alianzas / colaboraciones','Canjes','Distribución / reventa','Mayorista','Sponsor de eventos','Otro']) },
      { id:'dirige', titulo:'A quién se dirige', icono:'grupo', type:'chips', campo:'dirige',
        opciones:_ops(['Consumidor final','Creadores/as','Comunidades','Organizadores de experiencias','Otros negocios / empresas','Instituciones / ONGs','Público general','Otro']) },
      { id:'alcance', titulo:'Alcance', icono:'globo', type:'chips', campo:'alcance', opciones:ALCANCE_5 }
    ],
    columnas:[['rubros'], ['ofrece'], ['propuesta'], ['dirige', 'alcance']]
  },

  lugar: {
    titulo:'Filtros de Lugar', color:'#A8CC74',
    secciones:[
      { id:'tipo', titulo:'Tipo de lugar', icono:'casa', type:'lista', campo:'tipo',
        buscador:'Buscar tipo de lugar…',
        opciones:_ops(['Centro holístico / bienestar','Salón de eventos / celebraciones','Estancia / campo / quinta','Espacio cultural','Café / restaurante / espacio gastronómico','Hotel / alojamiento','Glamping / eco-lodge','Centro de retiros','Estudio / sala de actividades','Espacio natural / al aire libre','Coworking / espacio de trabajo','Otro']) },
      { id:'instalaciones', titulo:'Instalaciones y servicios', icono:'engranaje', type:'chips', campo:'instalaciones',
        opciones:_ops(['Salas interiores','Espacio al aire libre','Alojamiento','Gastronomía','Cocina equipada','Baños / duchas','Sonido profesional','Iluminación','Escenario','Carpas / domos','Estacionamiento','Acceso WiFi','Área de camping','Transporte / traslados','Piscina','Espacio de coworking','Otro']) },
      { id:'quehacer', titulo:'Qué hacer', icono:'brote', type:'chips', campo:'quehacer',
        opciones:_ops(['Retiros','Festivales','Talleres / cursos','Ceremonias','Conciertos','Celebraciones','Encuentros comunitarios','Grabaciones','Residencias artísticas','Eventos corporativos','Prácticas de bienestar','Actividades deportivas','Otro']) },
      { id:'orientado', titulo:'Público orientado', icono:'grupo', type:'chips', campo:'orientado',
        opciones:_ops(['Público general','Comunidades','Creadores/as','Organizadores de experiencias','Empresas / marcas','Grupos privados','Otro']) },
      { id:'edades', titulo:'Público y edades', icono:'grupo', type:'chips', campo:'edades',
        opciones:_ops(['Infancias','Adolescentes','Adultos','Familias','Todas las edades']) },
      { id:'entorno', titulo:'Entorno', icono:'brujula', type:'chips', campo:'entorno',
        opciones:_ops(['Urbano','Rural','Natural','Frente al mar','Montaña','Río / lago','Bosque / selva','Otro']) },
      { id:'horaria', titulo:'Disponibilidad horaria', icono:'reloj', type:'chips', campo:'horaria',
        opciones:_ops(['Mañana','Tarde','Noche','24 horas']) },
      { id:'espacio', titulo:'Disponibilidad del espacio', icono:'puerta', type:'chips', campo:'espacio',
        opciones:_ops(['Abierto a visitantes','Alquiler para eventos','Alquiler por horas','Uso exclusivo','Reservas grupales']) },
      { id:'accesibilidad', titulo:'Accesibilidad', icono:'accesibilidad', type:'chips', campo:'accesibilidad',
        opciones:_ops(['Acceso sin escalones','Rampas','Baños accesibles','Ascensor','Estacionamiento accesible','Otro']) },
      { id:'alcance', titulo:'Alcance', icono:'globo', type:'chips', campo:'alcance',
        opciones:_ops(['Local','Regional','Nacional','Internacional']) }
    ],
    columnas:[['tipo', 'alcance'], ['instalaciones'], ['quehacer'], ['orientado', 'edades'], ['entorno', 'horaria', 'espacio', 'accesibilidad']]
  }
};

/* Etiqueta visible de una opción, en el idioma activo si estuviera traducida. */
function tribuFiltroLabel(op, lang){
  return (op && (op[lang || document.documentElement.lang.slice(0, 2)] || op.es)) || '';
}

/* Las mismas prácticas, agrupadas por ámbito y con el formato que espera el
   editor de perfil (DISCIPLINA_GRUPOS). Con esto, lo que carga un perfil y lo
   que ofrece el filtro son exactamente el mismo vocabulario. */
const DISCIPLINA_GRUPOS_CATALOGO = (() => {
  const out = {};
  TRIBU_AMBITOS.forEach(a => {
    const lista = TRIBU_PRACTICAS.filter(p => p.ambitos[0] === a.id).map(p => p.es);
    if(lista.length) out[a.es] = lista;
  });
  return out;
})();
