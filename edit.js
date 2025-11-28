async function api(path, opts={}){
  const res = await fetch(path, { headers: { 'Content-Type':'application/json' }, ...opts });
  if(!res.ok) throw new Error(await res.text());
  const ct = res.headers.get('Content-Type')||'';
  return ct.includes('application/json')? res.json() : res.text();
}

function qs(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function val(id){ return document.getElementById(id).value; }
function set(id, v){ document.getElementById(id).value = v==null? '': v; }

let rid = null;

async function loadCategories(selected){
  const data = await api('/api/categories');
  const sel = document.getElementById('category');
  sel.innerHTML = '';
  data.items.forEach(c=>{
    const opt = document.createElement('option'); opt.value=c.id; opt.textContent=c.name; sel.appendChild(opt);
  });
  if(selected) sel.value = selected;
}

async function loadReport(){
  const list = await api('/api/reports?page=1&page_size=9999');
  const r = list.items.find(x=> x.id === rid);
  if(!r){ alert('未找到报告'); location.href='reports.html'; return; }
  await loadCategories(r.category);
  set('project_name', r.project_name);
  set('category', r.category);
  set('ai_rating', r.ai_rating);
  set('twitter_handle', r.twitter_handle);
  set('ticker', r.ticker);
  set('launchpad', r.launchpad);
  set('labels', r.labels);
  set('dev_activity_rating', r.dev_activity_rating);
  set('dev_activity_note', r.dev_activity_note);
  set('basic_info', r.basic_info);
  set('team_background', r.team_background);
  set('token_mechanism', r.token_mechanism);
  set('progress_plan', r.progress_plan);
  set('business_potential', r.business_potential);
  set('competitors', r.competitors);
}

async function save(){
  const body = {
    project_name: val('project_name'),
    category: val('category'),
    ai_rating: (val('ai_rating')===''? null : Number(val('ai_rating'))),
    twitter_handle: val('twitter_handle'),
    ticker: val('ticker'),
    launchpad: val('launchpad'),
    labels: val('labels'),
    dev_activity_rating: (val('dev_activity_rating')===''? null : Number(val('dev_activity_rating'))),
    dev_activity_note: val('dev_activity_note'),
    basic_info: val('basic_info'),
    team_background: val('team_background'),
    token_mechanism: val('token_mechanism'),
    progress_plan: val('progress_plan'),
    business_potential: val('business_potential'),
    competitors: val('competitors')
  };
  await api(`/api/reports/${encodeURIComponent(rid)}`, { method:'PUT', body: JSON.stringify(body) });
  alert('保存成功');
}

async function restore(){
  await api(`/api/reports/${encodeURIComponent(rid)}/restore-last-edit`, { method:'POST' });
  alert('已恢复最近一次编辑副本');
  await loadReport();
}

document.addEventListener('DOMContentLoaded', async ()=>{
  rid = qs('id');
  if(!rid){ alert('缺少报告ID'); location.href='reports.html'; return; }
  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('restoreBtn').addEventListener('click', restore);
  document.getElementById('backBtn').addEventListener('click', ()=> location.href='reports.html');
  await loadReport();
});

