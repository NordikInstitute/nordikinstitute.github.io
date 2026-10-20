/* Progressive enhancements. All routes/content are server-rendered static HTML. */
(()=>{
  const menu=document.getElementById('mobile-nav');
  const toggle=document.getElementById('mobile-toggle');
  if(menu&&toggle){toggle.addEventListener('click',()=>{const next=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(next));menu.hidden=!next;});}

  // Filtered gallery: full source-backed search including team member credits.
  const gallery=document.getElementById('project-grid');
  const search=document.getElementById('project-search');
  if(gallery&&search){
    const cards=Array.from(gallery.querySelectorAll('.project-card'));
    const buttons=Array.from(document.querySelectorAll('[data-filter]'));
    const select=document.getElementById('project-sort');
    const count=document.getElementById('results-label');
    const empty=document.getElementById('empty-projects');
    const reset=document.getElementById('reset-filters');
    let filter='all';let projects=[];
    const siteBasePath=document.querySelector('meta[name="site-base-path"]')?.content||'';
    fetch(`${siteBasePath}/data/projects.json`).then(r=>r.ok?r.json():[]).then(data=>{projects=data;apply();}).catch(()=>{});
    const params=new URLSearchParams(location.search);
    const allowed=['all',...buttons.map(b=>b.dataset.filter)];
    const saved=params.get('theme'); if(saved&&allowed.includes(saved))filter=saved;
    search.value=params.get('q')||'';
    const saveUrl=()=>{const u=new URL(location.href);if(filter==='all')u.searchParams.delete('theme');else u.searchParams.set('theme',filter);if(search.value.trim())u.searchParams.set('q',search.value.trim());else u.searchParams.delete('q');if(location.origin!=='null')history.replaceState(null,'',u.pathname+u.search);};
    function apply(){
      const q=search.value.toLocaleLowerCase().trim();let visible=0;
      cards.forEach(card=>{
        const projectPath=card.querySelector('.card-image')?.getAttribute('href')||'';
        const slug=projectPath.split('/').filter(Boolean).pop();
        const record=projects.find(p=>p.slug===slug);
        const searchable=[card.dataset.title,card.dataset.tags,record?.intro,record?.subtitle,record?.team?.join(' '),record?.partners?.join(' '),record?.findings?.join(' ')].filter(Boolean).join(' ').toLocaleLowerCase();
        const ok=(filter==='all'||card.dataset.cat===filter)&&(!q||searchable.includes(q));card.hidden=!ok;if(ok)visible++;
      });
      buttons.forEach(b=>{const active=b.dataset.filter===filter;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
      if(count)count.textContent=`Showing ${visible} of ${cards.length} projects`;
      if(empty)empty.hidden=visible!==0;
      if(select){const sort=select.value;if(sort!=='curated'){const sorted=cards.slice().sort((a,b)=>a.dataset.title.localeCompare(b.dataset.title)*(sort==='za'?-1:1));sorted.forEach(c=>gallery.appendChild(c));}else{cards.forEach(c=>gallery.appendChild(c));}}
      saveUrl();
    }
    buttons.forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;apply();}));
    search.addEventListener('input',apply);if(select)select.addEventListener('change',apply);
    if(reset)reset.addEventListener('click',()=>{filter='all';search.value='';apply();search.focus();});
    apply();
  }

  const peopleSearch=document.getElementById('people-search');
  if(peopleSearch){const cards=[...document.querySelectorAll('.researcher-card')];const empty=document.getElementById('empty-people');peopleSearch.addEventListener('input',()=>{const q=peopleSearch.value.toLocaleLowerCase().trim();let visible=0;for(const card of cards){const show=card.textContent.toLocaleLowerCase().includes(q);card.hidden=!show;if(show)visible++;}if(empty)empty.hidden=visible>0;});}

  // Source-derived image zoom; original vector PDF is a separate readable mode.
  const reader=document.getElementById('reader');
  if(reader){
    const img=reader.querySelector('#zoom-image');const viewport=reader.querySelector('#poster-scroller');const value=reader.querySelector('#zoom-value');
    const pdf=reader.querySelector('#pdf-reader');const imagePanel=reader.querySelector('#image-reader');
    const imageTab=reader.querySelector('#mode-image');const pdfTab=reader.querySelector('#mode-pdf');const tools=reader.querySelector('.reader-tools');
    let zoom=1;let mode='image';
    const showScale=()=>{img.style.width=`${Math.round(zoom*100)}%`;value.textContent=`${Math.round(zoom*100)}%`;};
    const setMode=(which)=>{mode=which;pdf.hidden=which!=='pdf';imagePanel.hidden=which!=='image';imageTab.classList.toggle('active',which==='image');pdfTab.classList.toggle('active',which==='pdf');imageTab.setAttribute('aria-selected',String(which==='image'));pdfTab.setAttribute('aria-selected',String(which==='pdf'));tools.hidden=which==='pdf';if(which==='pdf'){const iframe=pdf.querySelector('iframe');if(!iframe.src)iframe.src=iframe.dataset.src;}};
    reader.querySelector('#zoom-in').addEventListener('click',()=>{zoom=Math.min(3,zoom+.25);showScale();});
    reader.querySelector('#zoom-out').addEventListener('click',()=>{zoom=Math.max(.5,zoom-.25);showScale();});
    reader.querySelector('#zoom-fit').addEventListener('click',()=>{zoom=1;showScale();viewport.scrollLeft=0;});
    reader.querySelector('#reader-fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else reader.requestFullscreen?.();});
    imageTab.addEventListener('click',()=>setMode('image'));pdfTab.addEventListener('click',()=>setMode('pdf'));
    img.addEventListener('dragstart',e=>e.preventDefault());
    // Press Ctrl+wheel to zoom; scroll normally without Ctrl.
    viewport.addEventListener('wheel',(e)=>{if(!e.ctrlKey)return;e.preventDefault();zoom=Math.max(.5,Math.min(3,zoom+(e.deltaY<0?.1:-.1)));showScale();},{passive:false});
    reader.addEventListener('keydown',(e)=>{if(mode!=='image'||/input|textarea|select/i.test(e.target?.tagName))return;if(e.key==='+'||e.key==='='){e.preventDefault();zoom=Math.min(3,zoom+.25);showScale();}else if(e.key==='-'){e.preventDefault();zoom=Math.max(.5,zoom-.25);showScale();}});
  }

  const hall=document.getElementById('exhibition-hall');
  const hallDataEl=document.getElementById('hall-data');
  if(hall&&hallDataEl){
    const data=JSON.parse(hallDataEl.textContent);
    const base=document.querySelector('meta[name="site-base-path"]')?.content||'';
    const image=document.getElementById('hall-image');
    const count=document.getElementById('hall-count');
    const kicker=document.getElementById('hall-kicker');
    const heading=document.getElementById('hall-heading');
    const sub=document.getElementById('hall-sub');
    const question=document.getElementById('hall-question');
    const findings=document.getElementById('hall-findings');
    const status=document.getElementById('hall-status');
    const care=document.getElementById('hall-care');
    const story=document.getElementById('hall-story');
    const readerLink=document.getElementById('hall-reader');
    const frameLink=document.getElementById('hall-frame-link');
    const thumbs=[...hall.querySelectorAll('.hall-thumb')];
    const chips=[...hall.querySelectorAll('[data-hall-filter]')];
    const wallItems=[...document.querySelectorAll('#poster-wall .wall-item')];
    let filter='all';
    let index=Math.max(0,data.findIndex(p=>p.slug==='water-quality-monitoring'));
    const params=new URLSearchParams(location.search);
    const requested=params.get('poster');
    const theme=params.get('theme');
    if(theme&&(theme==='all'||data.some(project=>project.category===theme)))filter=theme==='all'?'all':theme;
    if(requested){const found=data.findIndex(project=>project.slug===requested);if(found>=0)index=found;}
    const strip=document.getElementById('hall-strip');
    const visible=()=>data.map((project,i)=>({project,i})).filter(item=>filter==='all'||item.project.category===filter);
    function show(nextIndex,fromUser){
      const sequence=visible();
      if(!sequence.length)return;
      if(!sequence.some(item=>item.i===nextIndex))nextIndex=sequence[0].i;
      index=nextIndex;
      const project=data[index];
      const place=sequence.findIndex(item=>item.i===index)+1;
      image.src=`${base}/assets/previews/${project.slug}.webp`;
      image.alt=`Original research poster for ${project.title}`;
      count.textContent=filter==='all'?`Poster ${place} of ${data.length}`:`Poster ${place} of ${sequence.length} in this room`;
      kicker.textContent=project.categoryName;
      heading.textContent=project.shortTitle;
      sub.textContent=project.subtitle;
      question.textContent=project.question;
      findings.replaceChildren(...project.findings.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
      status.textContent=project.status;
      care.hidden=!project.sensitive;
      const projectUrl=`${base}/projects/${project.slug}/`;
      story.href=projectUrl;
      readerLink.href=`${projectUrl}poster/`;
      frameLink.href=readerLink.href;
      thumbs.forEach(thumb=>{
        const on=thumb.dataset.hallSlug===project.slug;
        thumb.setAttribute('aria-current',String(on));
        thumb.hidden=filter!=='all'&&thumb.dataset.cat!==filter;
        if(on&&fromUser){
          const left=thumb.offsetLeft-(strip.scrollLeft||0);
          if(left<0||left+thumb.offsetWidth>strip.clientWidth)strip.scrollTo({left:Math.max(0,thumb.offsetLeft-12),behavior:'smooth'});
        }
      });
      wallItems.forEach(item=>{item.hidden=filter!=='all'&&item.dataset.cat!==filter;});
      chips.forEach(chip=>{const on=chip.dataset.hallFilter===filter;chip.classList.toggle('selected',on);chip.setAttribute('aria-pressed',String(on));});
      if(fromUser&&location.origin!=='null'){
        const url=new URL(location.href);
        url.searchParams.set('poster',project.slug);
        if(filter==='all')url.searchParams.delete('theme');else url.searchParams.set('theme',filter);
        history.replaceState(null,'',url.pathname+url.search);
      }
    }
    function step(direction){
      const sequence=visible();
      const place=sequence.findIndex(item=>item.i===index);
      const next=sequence[(place+direction+sequence.length)%sequence.length];
      show(next.i,true);
    }
    document.getElementById('hall-prev').addEventListener('click',()=>step(-1));
    document.getElementById('hall-next').addEventListener('click',()=>step(1));
    thumbs.forEach(thumb=>thumb.addEventListener('click',()=>show(data.findIndex(project=>project.slug===thumb.dataset.hallSlug),true)));
    chips.forEach(chip=>chip.addEventListener('click',()=>{filter=chip.dataset.hallFilter;show(index,true);}));
    hall.addEventListener('keydown',(event)=>{
      if(/input|textarea|select/i.test(event.target?.tagName))return;
      if(event.key==='ArrowRight'){event.preventDefault();step(1);}
      else if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}
    });
    show(index,false);
  }
})();
