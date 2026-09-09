(function () {
  'use strict';
  const C = window.LandingCore;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const assets = new URL('../../', document.currentScript.src);
  const revealObservers = new WeakMap();
  const platforms = {
    netflix:['Netflix.svg','#e63748'], disney:['Disney.svg','#7587ff'], prime:['primevideo.svg','#39b9f2'], max:['max.svg','#906dff'],
    spotify:['Spotify.svg','#47d594'], youtube:['youtube.svg','#ff595f'], paramount:['Paramount.svg','#568cff'],
    appletv:['Apple tv.svg','#b5bdd1'], crunchyroll:['Crunchyroll.svg','#ff994d'], vix:['vix.svg','#ff993f'],
    canva:['Canva.svg','#42d5ce'], capcut:['Capcut.svg','#bdc9d8'], chatgpt:['Chat GPT.svg','#5ccfa7'], iptv:['IPTV.svg','#96a4ff']
  };
  function icon(name) { const n = el('span','li-icon'); n.style.setProperty('--icon',`url("${new URL(`icons/landing/${name}.svg`,assets).href}")`); n.setAttribute('aria-hidden','true'); return n; }
  function identity(p) { const id = C.platformKey(String(p.id || p.name).split(':')[0]); const match = Object.hasOwn(platforms,id) ? platforms[id] : null; return {color:match?.[1]||'#90b6ff',logo:match?new URL(`logos/${encodeURIComponent(match[0])}`,assets).href:'',name:p.name||'Streaming'}; }
  function image(url, cls, alt, local = false) { const img = el('img',cls); img.src=local?url:C.safeImage(url); img.alt=alt; img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove());return img; }
  function art(p, cls) { const info=identity(p),n=el('div',cls); n.style.setProperty('--platform',info.color);n.append(el('span','art-orbit'));if(p.image)n.append(image(p.image,'product-image',p.name));else if(info.logo)n.append(image(info.logo,'platform-logo',info.name,true));else n.append(el('span','product-letter',info.name.slice(0,1).toUpperCase()));return n; }
  function contact(data, product, preview) {
    const a=el('a','contact');a.append(icon('message-circle'),el('span','',product?'Lo quiero':data.cta||'Consultar por WhatsApp'),icon('arrow-up-right'));
    const url=C.whatsappUrl(data.whatsapp,data.name,product);
    if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}else{a.setAttribute('aria-disabled','true');a.title='Configura tu WhatsApp';}
    if(preview)a.addEventListener('click',e=>e.preventDefault());return a;
  }
  function render(root,data,preview=false) {
    revealObservers.get(root)?.disconnect();
    revealObservers.delete(root);
    const template=['catalog','elegant','compact','spotlight','neon','magazine'].includes(data.template)?data.template:'catalog';
    const animate=root.dataset.renderedTemplate!==template;root.dataset.renderedTemplate=template;root.replaceChildren();
    root.className=`store template-${template} font-${data.font||'system'}${animate?' is-entering':''}`;
    const color=/^#[0-9a-f]{6}$/i.test(data.color)?data.color:'#146c60';root.style.setProperty('--brand',color);
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    root.style.setProperty('--brand-ink',rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#000000':'#ffffff');
    const shell=el('div','store-shell');root.append(shell);
    const header=el('header','store-header'),brand=el('div','brand');
    if(data.logo)brand.append(image(data.logo,'brand-logo','Logo'));else{const monogram=el('span','brand-monogram');monogram.append(icon('play'));brand.append(monogram);}
    const brandText=el('span','brand-text');brandText.append(el('strong','',data.name||'Tu negocio'),el('small','','STREAMING STORE'));brand.append(brandText);
    const nav=el('a','catalog-link','Explorar catálogo');nav.href='#catalogo';nav.append(icon('arrow-up-right'));header.append(brand,nav);shell.append(header);
    const products=[...(data.products||[])].sort((a,b)=>Number(b.featured)-Number(a.featured));
    const hero=el('section','store-hero'),copy=el('div','hero-copy');const eyebrow=el('p','eyebrow');eyebrow.append(icon('clapperboard'),el('span','','TU UNIVERSO STREAMING'));copy.append(eyebrow);
    const titles={catalog:['Dale play a','tus favoritos.'],elegant:['Grandes historias.','Tu próxima obsesión.'],compact:['Tu entretenimiento,','a un mensaje.'],spotlight:['Hoy el protagonista','eres tú.'],neon:['Enciende tu mundo.','Dale play.'],magazine:['Historias para','quedarte a ver.']};
    const heading=el('h1');heading.append(el('span','',titles[template][0]),el('span','hero-accent',titles[template][1]));copy.append(heading);
    copy.append(el('p','hero-description',data.description||'Películas, series y mucho más. Encuentra tu plataforma y empieza una nueva historia.'));
    const actions=el('div','hero-actions');actions.append(contact(data,null,preview));const explore=el('a','explore-button','Ver plataformas');explore.href='#catalogo';explore.append(icon('arrow-up-right'));actions.append(explore);copy.append(actions);
    const note=el('p','hero-note');note.append(icon('message-circle'),el('span','','Elige. Escríbenos. Disfruta.'));copy.append(note);hero.append(copy);
    const visual=el('div','hero-visual');
    if(data.cover){visual.classList.add('has-cover');visual.append(image(data.cover,'hero-cover','Portada del negocio'));}
    else{visual.setAttribute('aria-hidden','true');const unique=[...new Map(products.map(p=>[String(p.id).split(':')[0],p])).values()].slice(0,3);const scene=el('div','stream-scene');
      if(unique.length)unique.forEach((p,index)=>{const tile=art(p,'scene-tile');tile.style.setProperty('--tile',index);tile.append(el('span','scene-name',p.name));scene.append(tile);});
      else{const tile=el('div','scene-tile scene-empty');tile.append(icon('play'),el('span','scene-name','Tu próxima historia'));scene.append(tile);}
      visual.append(el('div','cinema-halo'),scene);const chip=el('div','scene-caption');chip.append(icon('play'),el('span','','¿Qué vas a ver hoy?'));visual.append(chip);}
    if(template==='spotlight' && products.length){
      const p=products[0];visual.removeAttribute('aria-hidden');visual.replaceChildren();visual.classList.add('spotlight-stage');
      const poster=art(p,'spotlight-poster');if(data.cover){poster.replaceChildren(image(data.cover,'product-image','Portada del negocio'));}visual.append(poster);
      const feature=el('div','spotlight-offer');feature.append(el('p','eyebrow',p.featured?'EN PRIMERA FILA':'DESCUBRE ESTA PLATAFORMA'),el('h2','',p.name));
      if(p.duration)feature.append(el('p','spotlight-duration',p.duration));
      if(typeof p.price==='number'&&p.price>0)feature.append(el('p','product-price',new Intl.NumberFormat('es-PE',{style:'currency',currency:data.currency||'PEN'}).format(p.price)));
      feature.append(contact(data,p,preview));visual.append(feature);
    }
    hero.append(visual);shell.append(hero);const band=el('div','discovery-band');band.append(el('span','','PELÍCULAS'),el('i','','✦'),el('span','','SERIES'),el('i','','✦'),el('span','','ENTRETENIMIENTO'));shell.append(band);
    const catalogCopy={catalog:['AQUÍ EMPIEZA TU PLAN','Encuentra tu próxima pantalla.'],elegant:['UNA SELECCIÓN PARA TI','Elige tu próxima obsesión.'],compact:['ELIGE Y CONSULTA','Tus plataformas, a un toque.'],spotlight:['SIGUE EXPLORANDO','Más protagonistas para tu pantalla.'],neon:['EXPLORA A TU RITMO','Desliza. Elige. Dale play.'],magazine:['EN CARTELERA','Historias que merecen tu tiempo.']};
    const catalog=el('section','catalog-section');catalog.id='catalogo';const head=el('div','catalog-heading'),title=el('div');title.append(el('p','eyebrow',catalogCopy[template][0]),el('h2','',catalogCopy[template][1]));head.append(title);catalog.append(head);
    const toolbar=el('div','catalog-tools'),filters=el('div','catalog-filters');filters.setAttribute('aria-label','Filtrar productos');const buttons=[];
    for(const [value,label] of [['all','Todo'],['profile','Perfiles'],['full','Cuentas completas']]){const b=el('button','filter-chip',label);b.type='button';b.dataset.filter=value;buttons.push(b);filters.append(b);}
    const searchLabel=el('label','catalog-search');searchLabel.append(icon('search'));const search=el('input');search.type='search';search.placeholder='Busca tu plataforma';search.setAttribute('aria-label','Buscar plataforma');search.value=root.dataset.search||'';searchLabel.append(search);toolbar.append(filters,searchLabel);if(products.length)catalog.append(toolbar);
    const list=el('div','product-grid'),cards=[];list.id='plataformas';let updateRail=()=>{};
    if(template==='neon' && products.length){
      list.tabIndex=0;list.setAttribute('aria-label','Plataformas. Desliza para explorar.');
      const rail=el('div','rail-navigation');rail.append(el('span','','DESLIZA Y DESCUBRE'));
      const controls=[];
      for(const [direction,label] of [[-1,'Plataformas anteriores'],[1,'Más plataformas']]){const button=el('button',direction===1?'rail-next':'rail-prev');button.type='button';button.setAttribute('aria-label',label);button.setAttribute('aria-controls','plataformas');button.append(icon('arrow-left'));button.onclick=()=>list.scrollBy({left:direction*list.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});rail.append(button);controls.push(button);}
      updateRail=()=>{controls[0].disabled=list.scrollLeft<=1;controls[1].disabled=list.scrollLeft+list.clientWidth>=list.scrollWidth-1;};list.addEventListener('scroll',updateRail,{passive:true});
      if('ResizeObserver' in window){const observer=new ResizeObserver(updateRail);observer.observe(list);const previous=revealObservers.get(root);previous?.disconnect();revealObservers.set(root,observer);}
      catalog.append(rail);
    }
    products.forEach((p,index)=>{const card=el('article','product-card');card.style.setProperty('--delay',`${Math.min(index,7)*65}ms`);card.style.setProperty('--platform',identity(p).color);const artwork=art(p,'product-art');
      const top=el('div','art-top');top.append(el('span','art-category','STREAMING'));if(p.featured)top.append(el('span','featured','Destacado'));artwork.append(top);const play=el('span','art-play');play.append(icon('play'));artwork.append(play);
      const info=el('div','product-info');info.append(el('p','product-type',p.mode==='full'?'Cuenta completa':'Perfil personal'),el('h3','',p.name));if(p.description)info.append(el('p','product-description',p.description));
      if(p.duration){const duration=el('p','product-duration');duration.append(icon('check'),el('span','',p.duration));info.append(duration);}
      if(typeof p.price==='number'&&p.price>0)info.append(el('p','product-price',new Intl.NumberFormat('es-PE',{style:'currency',currency:data.currency||'PEN'}).format(p.price)));
      info.append(contact(data,p,preview));card.append(artwork,info);list.append(card);cards.push({card,product:p});});
    const empty=el('p','empty-catalog',products.length?'No encontramos esa plataforma. Prueba con otro nombre.':'Estamos preparando nuestro catálogo. Escríbenos para conocer las opciones.');list.append(empty);catalog.append(list);shell.append(catalog);
    function filter(){const selected=root.dataset.productFilter||'all',term=C.platformKey(search.value);let hasResults=false;buttons.forEach(b=>{const active=b.dataset.filter===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});cards.forEach(({card,product})=>{const visible=(selected==='all'||product.mode===selected)&&C.platformKey(product.name).includes(term);card.hidden=!visible;hasResults||=visible;});empty.hidden=hasResults;}
    buttons.forEach(b=>{b.onclick=()=>{root.dataset.productFilter=b.dataset.filter;filter();updateRail();};});search.oninput=()=>{root.dataset.search=search.value;filter();updateRail();};filter();updateRail();
    if(animate && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('awaiting-reveal');entry.target.classList.add('card-revealed');observer.unobserve(entry.target);}});},{threshold:.05});
      const previous=revealObservers.get(root);revealObservers.set(root,{disconnect(){observer.disconnect();previous?.disconnect();}});cards.forEach(({card})=>{card.classList.add('awaiting-reveal');observer.observe(card);});
    }
    const closing=el('section','closing-banner'),closingText=el('div');closingText.append(el('h2','','Tu próximo plan empieza con un hola.'),el('p','','Te ayudamos a elegir tu plataforma favorita.'));closing.append(closingText,contact(data,null,preview));shell.append(closing);
    const footer=el('footer','store-footer');footer.append(el('span','',data.name||'Tu negocio'),el('span','','Consultas y pedidos por WhatsApp'));shell.append(footer);
  }
  window.LandingRender=render;
})();
