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
})();
