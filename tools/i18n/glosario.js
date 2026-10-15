// Arma /assets/i18n/glosario.js: equivalencias para buscar en inglés y portugués.
const fs = require('fs'), vm = require('vm');
const RAIZ = require('path').join(__dirname, '../../tribu-landing/assets/') + '/';
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(RAIZ + 'red-tribu-filtros.js', 'utf8') + ';this.P=TRIBU_PRACTICAS;this.A=TRIBU_AMBITOS;this.F=FILTROS_RED_TRIBU;', ctx);
const dic = l => { const w = {}; vm.runInContext(fs.readFileSync(RAIZ + 'i18n/' + l + '.js', 'utf8').replace('window.', 'this.'), Object.assign(vm.createContext(w), { window:w })); return w.TRIBU_DIC; };
const EN = dic('en'), PT = dic('pt');

const mapa = new Map();   // es -> [Set en, Set pt]
function agregar(es, en, pt){
  if(!es) return;
  if(!mapa.has(es)) mapa.set(es, [new Set(), new Set()]);
  const [a, b] = mapa.get(es);
  [].concat(en || []).forEach(x => x && x !== es && a.add(x));
  [].concat(pt || []).forEach(x => x && x !== es && b.add(x));
}
/* 1) Catálogo de la Red Tribu: prácticas, ámbitos y opciones de cada filtro */
const labels = new Set();
ctx.P.forEach(p => labels.add(p.es));
ctx.A.forEach(a => labels.add(a.es));
Object.values(ctx.F).forEach(cat => (cat.secciones || []).forEach(sec => (sec.opciones || []).forEach(o => o.es && labels.add(o.es))));
labels.forEach(es => agregar(es, EN[es], PT[es]));

/* 2) Palabras de todos los días (lo que la gente escribe en un buscador) */
const MANUAL = [
  ['agenda', ['calendar','events calendar','schedule','agenda','whats on','what to do'], ['agenda','calendário','programação','o que fazer']],
  ['eventos', ['events','event'], ['eventos','evento']],
  ['evento', ['event'], ['evento']],
  ['red tribu', ['tribu network','network','directory'], ['rede tribu','rede','diretório']],
  ['club', ['club','membership','members'], ['clube','assinatura','membros']],
  ['beneficios', ['benefits','perks'], ['benefícios','vantagens']],
  ['descuento', ['discount','discounts','deal','off'], ['desconto','descontos']],
  ['sorteo', ['giveaway','giveaways','raffle','contest'], ['sorteio','sorteios']],
  ['cumpleaños', ['birthday'], ['aniversário']],
  ['creador', ['creator','creators','facilitator','facilitators','teacher','teachers','therapist','therapists','artist','artists','organizer'], ['criador','criadora','criadores','facilitador','facilitadora','professor','professora','terapeuta','artista','organizador']],
  ['comunidad', ['community','communities','group','groups'], ['comunidade','comunidades','grupo','grupos']],
  ['experiencia', ['experience','experiences'], ['experiência','experiências']],
  ['marca', ['brand','brands','business','company'], ['marca','marcas','empresa','negócio']],
  ['lugar', ['venue','venues','place','places','space','spaces','location'], ['espaço','espaços','lugar','lugares','local']],
  ['taller', ['workshop','workshops','class','classes','course'], ['oficina','oficinas','aula','aulas','curso']],
  ['retiro', ['retreat','retreats'], ['retiro','retiros']],
  ['festival', ['festival','festivals'], ['festival','festivais']],
  ['feria', ['fair','fairs','market','expo'], ['feira','feiras','mercado']],
  ['ceremonia', ['ceremony','ceremonies'], ['cerimônia','cerimônias']],
  ['encuentro', ['gathering','gatherings','meetup','meeting'], ['encontro','encontros']],
  ['musica', ['music','live music','concert','concerts','gig'], ['música','música ao vivo','show','shows']],
  ['musica en vivo', ['live music'], ['música ao vivo']],
  ['danza', ['dance','dancing'], ['dança','dançar']],
  ['bailar', ['dance','dancing'], ['dançar']],
  ['meditacion', ['meditation','meditate'], ['meditação','meditar']],
  ['respiracion', ['breathing','breath','breathwork'], ['respiração']],
  ['sanacion', ['healing'], ['cura']],
  ['sonido', ['sound'], ['som']],
  ['bienestar', ['wellbeing','wellness','well-being'], ['bem-estar','bem estar']],
  ['naturaleza', ['nature','outdoors'], ['natureza']],
  ['al aire libre', ['outdoor','outdoors'], ['ao ar livre']],
  ['gastronomia', ['food','gastronomy','cooking'], ['gastronomia','comida','culinária']],
  ['cocina', ['cooking','kitchen','cuisine'], ['cozinha','culinária']],
  ['arte', ['art','arts'], ['arte','artes']],
  ['teatro', ['theater','theatre'], ['teatro']],
  ['espiritualidad', ['spirituality','spiritual'], ['espiritualidade','espiritual']],
  ['terapia', ['therapy','therapies'], ['terapia','terapias']],
  ['niños', ['kids','children','child'], ['crianças','infantil']],
  ['infancias', ['kids','children'], ['crianças','infância']],
  ['familia', ['family','families'], ['família','famílias']],
  ['gratis', ['free'], ['grátis','gratuito','gratuita']],
  ['gratuita', ['free'], ['gratuita','grátis']],
  ['pago', ['paid'], ['pago','paga']],
  ['online', ['online','virtual','remote'], ['online','virtual']],
  ['presencial', ['in person','in-person','on site','onsite'], ['presencial']],
  ['hoy', ['today','tonight'], ['hoje']],
  ['mañana', ['tomorrow'], ['amanhã']],
  ['fin de semana', ['weekend','this weekend'], ['fim de semana','final de semana']],
  ['finde', ['weekend'], ['fim de semana']],
  ['cerca', ['near','near me','nearby','close'], ['perto','perto de mim','próximo']],
  ['mapa', ['map'], ['mapa']],
  ['historias', ['stories','story','interviews','reels'], ['histórias','história','entrevistas']],
  ['entrevista', ['interview','interviews'], ['entrevista','entrevistas']],
  ['cuenta', ['account','my account'], ['conta','minha conta']],
  ['mi cuenta', ['my account','log in','login','sign in'], ['minha conta','entrar','login']],
  ['ingresar', ['login','log in','sign in'], ['entrar','login']],
  ['registro', ['sign up','signup','register','join'], ['cadastro','cadastrar','inscrever','participar']],
  ['sumarme', ['join','sign up'], ['participar','entrar','fazer parte']],
  ['perfil', ['profile'], ['perfil']],
  ['publicar', ['publish','post','upload'], ['publicar']],
  ['contacto', ['contact','contact us'], ['contato','fale conosco']],
  ['privacidad', ['privacy'], ['privacidade']],
  ['terminos', ['terms','terms and conditions'], ['termos','termos e condições']],
  ['cookies', ['cookies'], ['cookies']],
  ['preguntas', ['faq','questions','help'], ['perguntas','dúvidas','ajuda']],
  ['planes', ['plans','pricing','prices','price'], ['planos','preços','preço','valores']],
  ['precios', ['prices','pricing','cost'], ['preços','valores','custo']],
  ['cuanto cuesta', ['how much','price'], ['quanto custa']],
  ['difundir mi evento', ['promote my event','advertise','promotion'], ['divulgar meu evento','divulgação','anunciar']],
  ['agregar mi evento', ['add my event','submit event','list my event'], ['adicionar meu evento','cadastrar evento','incluir evento']],
  ['inicio', ['home','homepage','start'], ['início','página inicial']],
  ['finanzas', ['finance','budget','break even','calculator'], ['finanças','orçamento','calculadora']],
  ['yoga', ['yoga'], ['ioga','yoga']],
  ['cacao', ['cacao','cocoa'], ['cacau']],
  ['hongos', ['mushrooms','fungi'], ['cogumelos','fungos']],
  ['tarot', ['tarot'], ['tarô']],
  ['vino', ['wine'], ['vinho']],
  ['fiesta', ['party'], ['festa']]
];
MANUAL.forEach(([es, en, pt]) => agregar(es, en, pt));

const out = [...mapa.entries()].filter(([, [a, b]]) => a.size || b.size).map(([es, [a, b]]) => [es, [...a], [...b]]);
fs.writeFileSync(RAIZ + 'i18n/glosario.js', '/* Equivalencias para buscar en inglés y portugués (generado; ver assets/i18n.js) */\nwindow.TRIBU_GLOSARIO=' + JSON.stringify(out) + ';\n');
console.log(out.length, 'entradas', Math.round(fs.statSync(RAIZ + 'i18n/glosario.js').size / 1024) + 'KB');
