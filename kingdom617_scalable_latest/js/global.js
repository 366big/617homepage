/* Kingdom 617 — Global Royal Archive Cursor */
(function(){
  if(!window.matchMedia || !window.matchMedia("(pointer:fine)").matches) return;

  const dot=document.createElement("div");
  const ring=document.createElement("div");
  dot.className="k617-cursor-dot";
  ring.className="k617-cursor-ring";
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let x=-100,y=-100,rx=-100,ry=-100,active=false;

  function move(e){
    x=e.clientX; y=e.clientY;
    if(!active){
      active=true;
      dot.style.opacity="1";
      ring.style.opacity="1";
    }
    dot.style.transform=`translate3d(${x}px,${y}px,0)`;
  }

  function animate(){
    rx+=(x-rx)*0.16;
    ry+=(y-ry)*0.16;
    ring.style.transform=`translate3d(${rx}px,${ry}px,0)`;
    requestAnimationFrame(animate);
  }

  document.addEventListener("mousemove",move,{passive:true});
  document.addEventListener("mouseleave",()=>{
    dot.style.opacity="0";
    ring.style.opacity="0";
  });
  document.addEventListener("mouseenter",()=>{
    if(active){
      dot.style.opacity="1";
      ring.style.opacity="1";
    }
  });
  document.addEventListener("mousedown",()=>ring.classList.add("is-press"));
  document.addEventListener("mouseup",()=>ring.classList.remove("is-press"));

  function bindHover(){
    document.querySelectorAll(
      'a,button,input,select,textarea,[role="button"],.card,.ranking-card,.alliance-card,.nav-link'
    ).forEach(el=>{
      if(el.dataset.k617CursorBound) return;
      el.dataset.k617CursorBound="1";
      el.addEventListener("mouseenter",()=>ring.classList.add("is-hover"));
      el.addEventListener("mouseleave",()=>ring.classList.remove("is-hover"));
    });
  }

  bindHover();
  new MutationObserver(bindHover).observe(document.body,{childList:true,subtree:true});
  animate();
})();

/* =========================================================
   KINGDOM 617 — PREMIUM MICRO-INTERACTIONS
   Additive only: scroll reveal, progress, ambient glow, particles, ripple.
   ========================================================= */
(function(){
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  // Scroll progress
  const progress=document.createElement('div');
  progress.className='k617-scroll-progress';
  document.body.appendChild(progress);
  const updateProgress=()=>{
    const doc=document.documentElement;
    const max=Math.max(1,doc.scrollHeight-window.innerHeight);
    progress.style.width=Math.min(100,Math.max(0,(window.scrollY/max)*100))+'%';
  };
  window.addEventListener('scroll',updateProgress,{passive:true});
  window.addEventListener('resize',updateProgress,{passive:true});
  updateProgress();

  // Ambient mouse light on desktop
  if(!coarse && !reduce){
    const glow=document.createElement('div');
    glow.className='k617-mouse-glow';
    document.body.appendChild(glow);
    let gx=-500,gy=-500,active=false;
    document.addEventListener('mousemove',e=>{
      gx=e.clientX; gy=e.clientY;
      glow.style.left=gx+'px'; glow.style.top=gy+'px';
      if(!active){active=true;glow.style.opacity='1';}
    },{passive:true});
    document.addEventListener('mouseleave',()=>glow.style.opacity='0');
  }

  // Subtle gold dust — desktop only, intentionally sparse for performance.
  if(!coarse && !reduce){
    const dust=document.createDocumentFragment();
    for(let i=0;i<14;i++){
      const s=document.createElement('span');
      s.className='k617-dust';
      s.style.left=(Math.random()*100)+'vw';
      s.style.top=(Math.random()*100)+'vh';
      s.style.animationDelay=(-Math.random()*12)+'s';
      s.style.animationDuration=(8+Math.random()*9)+'s';
      s.style.setProperty('--drift',(Math.random()*70-35)+'px');
      dust.appendChild(s);
    }
    document.body.appendChild(dust);
  }

  // Reveal major blocks as they enter the viewport.
  const revealSelectors=[
    '.head','.heading','.hero-head','.kingdom-intro','.kingdom-stats','.principles-head',
    '.principles-grid > *','.grid > *','.cards > *','.panel','.events-panel','.table-wrap',
    '.meta','.kvk-summary-card','.kvk-history-table-wrap','.split > *'
  ];
  const seen=new WeakSet();
  const setupReveal=()=>{
    const nodes=document.querySelectorAll(revealSelectors.join(','));
    nodes.forEach((el,i)=>{
      if(seen.has(el)) return;
      seen.add(el);
      el.classList.add('k617-reveal');
      const delay=(i%7)+1;
      el.classList.add('k617-delay-'+delay);
    });
    if(reduce){nodes.forEach(el=>el.classList.add('k617-visible'));return;}
    if(!('IntersectionObserver' in window)){nodes.forEach(el=>el.classList.add('k617-visible'));return;}
    const io=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('k617-visible');io.unobserve(entry.target);}
      });
    },{threshold:.08,rootMargin:'0px 0px -8% 0px'});
    nodes.forEach(el=>{if(!el.classList.contains('k617-visible'))io.observe(el);});
  };
  setupReveal();
  new MutationObserver(setupReveal).observe(document.body,{childList:true,subtree:true});

  // Gold ripple for clickable controls.
  document.addEventListener('pointerdown',e=>{
    const el=e.target.closest('button,a,.badge,[role="button"]');
    if(!el || reduce) return;
    const rect=el.getBoundingClientRect();
    const r=document.createElement('span');
    r.className='k617-ripple';
    r.style.left=(e.clientX-rect.left)+'px';
    r.style.top=(e.clientY-rect.top)+'px';
    el.appendChild(r);
    setTimeout(()=>r.remove(),650);
  },{passive:true});
})();
