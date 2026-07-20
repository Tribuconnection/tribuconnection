/* Tribu Connection — JS mínimo compartido por las landings de perfil */
(function(){
  /* Nav: fondo al scrollear */
  const nav = document.getElementById('nav');
  if(nav){
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    onScroll(); window.addEventListener('scroll', onScroll, {passive:true});
  }

  /* Menú mobile */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  if(burger && menu){
    let menuOpenScrollY = 0;
    const toggleMenu = (open) => {
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      if(open) menuOpenScrollY = window.scrollY;
    };
    burger.addEventListener('click', () => toggleMenu(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
    window.addEventListener('scroll', () => {
      if(menu.classList.contains('open') && Math.abs(window.scrollY - menuOpenScrollY) > 4){ toggleMenu(false); }
    }, {passive:true});
  }

  /* Reveal al scrollear */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('.reveal');
  if(reduce){
    reveals.forEach(el => el.classList.add('in'));
  }else{
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:.14, rootMargin:'0px 0px -8% 0px'});
    reveals.forEach(el => io.observe(el));
  }
})();
