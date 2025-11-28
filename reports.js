async function api(path, opts={}){
  const res = await fetch(path, { headers: { 'Content-Type':'application/json' }, ...opts });
  if(!res.ok) throw new Error(await res.text());
  const ct = res.headers.get('Content-Type')||'';
  return ct.includes('application/json')? res.json() : res.text();
}

function el(html){
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstChild;
}

let state = { category: 'ALL', search: '', sort: 'recent', page: 1, page_size: 12 };

async function loadCategories(){
  const data = await api('/api/categories');
  const tabs = document.getElementById('categoryTabs');
  tabs.innerHTML = '';
  const cats = [{id:'ALL', name:'ALL'}, ...data.items];
  cats.forEach(c=>{
    const t = el(`<button class="tab">${c.name}</button>`);
    if(state.category === c.id) t.classList.add('active');
    t.addEventListener('click', ()=>{ state.category = c.id; state.page=1; refresh(); });
    tabs.appendChild(t);
  });
  // list for management
  const list = document.getElementById('categoryList');
  list.innerHTML = '';
  data.items.forEach(c=>{
    const row = el(`<div class="toolbar"><span>${c.name}</span></div>`);
    const del = el(`<button class="btn danger">删除</button>`);
    del.addEventListener('click', async ()=>{
      if(c.id==='qita'){ alert('“其他”不可删除'); return; }
      if(!confirm(`确认删除类别“${c.name}”？其下报告将归入“其他”。`)) return;
      await api(`/api/categories/${encodeURIComponent(c.id)}`, { method:'DELETE' });
      await loadCategories();
      await refresh();
    });
    row.appendChild(del);
    list.appendChild(row);
  });
}

function renderGrid(items){
  const grid = document.getElementById('reportGrid');
  grid.innerHTML = '';
  items.forEach(r=>{
    const rating = (r.ai_rating==null)? '无评分' : r.ai_rating;
    const tw = r.twitter_handle || '';
    const twLink = tw.startsWith('@')? `https://x.com/${tw.slice(1)}` : (tw.startsWith('http')? tw : '');
    const card = el(`<div class="card"><div class="card-body">
      <h3 class="card-title">${r.project_name}</h3>
      <p class="card-meta">标签：${r.labels||'未知'} · 评分：${rating} · 类别：${r.category}</p>
      <p class="card-meta">生成时间：${r.generated_at||'未知'}</p>
      <div class="card-actions">
        <button class="btn" data-act="edit">编辑</button>
        <button class="btn danger" data-act="del">删除</button>
        ${twLink? `<a class="btn" href="${twLink}" target="_blank" rel="noopener">官推</a>`:''}
      </div>
    </div></div>`);
    card.querySelector('[data-act="del"]').addEventListener('click', async ()=>{
      if(!confirm(`确认删除“${r.project_name}”？删除为软删。`)) return;
      await api(`/api/reports/${encodeURIComponent(r.id)}`, { method:'DELETE' });
      await refresh();
    });
    card.querySelector('[data-act="edit"]').addEventListener('click', ()=>{
      location.href = `edit.html?id=${encodeURIComponent(r.id)}`;
    });
    grid.appendChild(card);
  });
}

async function refresh(){
  const q = new URLSearchParams();
  if(state.category && state.category!=='ALL') q.set('category', state.category);
  if(state.search) q.set('search', state.search);
  q.set('sort', state.sort);
  q.set('page', state.page);
  q.set('page_size', state.page_size);
  const data = await api('/api/reports?'+q.toString());
  renderGrid(data.items);
  renderPager(data.total);
}

function renderPager(total){
  const p = document.getElementById('pager');
  p.innerHTML = '';
  const pages = Math.max(1, Math.ceil(total / state.page_size));
  const info = el(`<span class="muted">共 ${total} 条，${pages} 页</span>`);
  p.appendChild(info);
  const prev = el(`<button class="btn">上一页</button>`);
  const next = el(`<button class="btn">下一页</button>`);
  prev.disabled = state.page <= 1;
  next.disabled = state.page >= pages;
  prev.addEventListener('click', ()=>{ if(state.page>1){ state.page--; refresh(); } });
  next.addEventListener('click', ()=>{ if(state.page<pages){ state.page++; refresh(); } });
  p.appendChild(prev);
  p.appendChild(next);
}

document.addEventListener('DOMContentLoaded', async ()=>{
  document.getElementById('searchInput').addEventListener('input', (e)=>{ state.search = e.target.value.trim(); state.page=1; refresh(); });
  document.getElementById('sortSelect').addEventListener('change', (e)=>{ state.sort = e.target.value; state.page=1; refresh(); });
  document.getElementById('refreshBtn').addEventListener('click', refresh);
  document.getElementById('addCatBtn').addEventListener('click', async ()=>{
    const name = document.getElementById('newCatName').value.trim();
    if(!name){ alert('请输入类别名称'); return; }
    await api('/api/categories', { method:'POST', body: JSON.stringify({ name }) });
    document.getElementById('newCatName').value = '';
    await loadCategories();
  });
  await loadCategories();
  await refresh();
});
