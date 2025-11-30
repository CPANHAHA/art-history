function buildPrompt({ projectName, ticker, twitter, website }){
  const now = new Date().toISOString();
  const pn = (projectName || '').trim();
  const tk = (ticker || '').trim() || '未知';
  const tw = (twitter || '').trim();
  const wb = (website || '').trim();
  const lines = [
    '你是资深加密投研分析师。请仅基于可验证来源（项目官网、官方推特/X、开源仓库、主流数据平台）进行分析，不得编造。无法确认的内容请写“未知”。',
    '',
    '目标项目：' + pn,
    'Ticker：' + tk,
    '官方推特：' + tw,
    '官网：' + wb,
    '',
    '输出要求：',
    '- 仅输出严格 JSON（不含多余文字或注释）。',
    '- 字段必须使用以下键名；允许缺失时填空字符串或 null；数组可为空数组。',
    '- 评分范围 0–5；若无法给出则用 null。',
    '- 附带 generated_at（ISO 时间），以及 sources（来源列表）。',
    '',
    'JSON 结构示例：',
    '{',
    '  "focus_points": ["一句短语","一句短语"],',
    '  "ai_rating": null,',
    '  "twitter_handle": "@xxx",',
    '  "ticker": "' + tk + '",',
    '  "launchpad": "未知",',
    '  "labels": "一句短语",',
    '  "basic_info": "项目介绍与核心特点。",',
    '  "team_background": "团队背景。",',
    '  "dev_activity_rating": null,',
    '  "dev_activity_note": "最近推特活跃度简述。",',
    '  "token_mechanism": "如有说明",',
    '  "progress_plan": "当下进展/后续规划",',
    '  "business_potential": "商业潜力",',
    '  "competitors": "竞品简介",',
    '  "sources": [{"url":"https://...","title":"来源标题","note":"摘录要点"}],',
    '  "generated_at": "' + now + '"',
    '}',
    '',
    '请保证仅输出上述 JSON。'
  ];
  return lines.join('\n');
}

function toPreview(obj){
  const safe = (v)=> (v===null||v===undefined||v==="")?"未知":v;
  const arr = (v)=> Array.isArray(v)?v:[];
  const rating = (v)=> (typeof v === 'number')? v : '无评分';
  return `项目名称：${safe(obj.project_name)}\n`
    + `AI评分：${rating(obj.ai_rating)}\n`
    + `官推：${safe(obj.twitter_handle)}\n`
    + `ticker：${safe(obj.ticker)}\n`
    + `launchpad：${safe(obj.launchpad)}\n`
    + `标签：${safe(obj.labels)}\n`
    + `基本信息：\n${safe(obj.basic_info)}\n\n`
    + `团队背景：\n${safe(obj.team_background)}\n\n`
    + `DEV活跃评分：${rating(obj.dev_activity_rating)}\n`
    + `DEV活跃简述：${safe(obj.dev_activity_note)}\n\n`
    + `代币机制/功能：\n${safe(obj.token_mechanism)}\n\n`
    + `当下进展/后续规划：\n${safe(obj.progress_plan)}\n\n`
    + `商业潜力：\n${safe(obj.business_potential)}\n\n`
    + `竞品简介：\n${safe(obj.competitors)}\n\n`
    + `当下重点关注：\n- ${arr(obj.focus_points).map(s=>safe(s)).join('\n- ')}\n\n`
    + `来源：\n- ${arr(obj.sources).map(s=>safe(s.url||s)).join('\n- ')}\n\n`
    + `生成时间：${safe(obj.generated_at)}`;
}

function copyText(text){
  return navigator.clipboard.writeText(text);
}

function showError(msg){
  const el = document.getElementById('importError');
  el.textContent = msg || '';
}

function showPreview(obj){
  const box = document.getElementById('importPreview');
  box.style.display = 'block';
  box.innerHTML = `<div class="help">预览仅展示；保存将稍后在报告管理中实现。</div>`+
    `<div class="pre">${toPreview(obj)}</div>`;
}

function parseSelectedFile(){
  showError('');
  const fileInput = document.getElementById('fileInput');
  const f = fileInput.files?.[0];
  if(!f){
    showError('请先选择 JSON 文件');
    return;
  }
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const obj = JSON.parse(reader.result);
      if(typeof obj !== 'object' || obj === null){
        showError('JSON 结构无效');
        return;
      }
      const name = obj.project_name || obj.projectName || '';
      if(!name || typeof name !== 'string' || !name.trim()){
        showError('导入失败：缺少必填字段 project_name');
        return;
      }
      obj.project_name = name.trim();
      showPreview(obj);
    }catch(e){
      showError('解析失败：'+ e.message);
    }
  };
  reader.onerror = ()=> showError('文件读取失败');
  reader.readAsText(f);
}

document.addEventListener('DOMContentLoaded', ()=>{
  const copyBtn = document.getElementById('copyPrompt');
  const parseBtn = document.getElementById('parseJson');
  copyBtn.addEventListener('click', async ()=>{
    const projectName = document.getElementById('projectName').value;
    if(!projectName || !projectName.trim()){
      alert('请先填写项目名称');
      return;
    }
    const ticker = document.getElementById('ticker').value;
    const twitter = document.getElementById('twitter').value;
    const website = document.getElementById('website').value;
    const prompt = buildPrompt({ projectName, ticker, twitter, website });
    await copyText(prompt);
    alert('已复制固定 Prompt，请前往外部 AI 生成 JSON');
  });
  parseBtn.addEventListener('click', parseSelectedFile);
  initCategories();
  initReports();
});

async function api(path, method='GET', data){
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (data) opts.body = JSON.stringify(data);
  const resp = await fetch(path, opts);
  const ct = resp.headers.get('Content-Type')||'';
  const body = ct.includes('application/json') ? await resp.json() : await resp.text();
  return { ok: resp.ok, body };
}

async function initCategories(){
  const addBtn = document.getElementById('btnAddCategory');
  const nameInput = document.getElementById('newCategoryName');
  const msg = document.getElementById('categoryMsg');
  addBtn.addEventListener('click', async ()=>{
    msg.textContent='';
    const name = (nameInput.value||'').trim();
    if (!name){ msg.textContent='请输入分类名称'; return; }
    const r = await api('/api/categories','POST',{ name });
    msg.textContent = r.ok ? '创建成功' : (r.body && r.body.error) || '创建失败';
    await loadCategories();
  });
  await loadCategories();
}

async function loadCategories(){
  const list = document.getElementById('categoryList');
  const filter = document.getElementById('filterCategory');
  list.innerHTML='';
  const r = await api('/api/categories');
  const items = (r.ok && r.body && r.body.items) ? r.body.items : [];
  const frag = document.createDocumentFragment();
  items.forEach(c => {
    const row = document.createElement('div');
    row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.margin='6px 0';
    const name = document.createElement('span'); name.textContent = `${c.name} (${c.id})`;
    const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='8px';
    const renameBtn = document.createElement('button'); renameBtn.className='btn'; renameBtn.textContent='重命名'; renameBtn.onclick = ()=> renameCategory(c);
    const delBtn = document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent='删除'; delBtn.onclick = ()=> deleteCategory(c);
    actions.appendChild(renameBtn); actions.appendChild(delBtn);
    row.appendChild(name); row.appendChild(actions);
    frag.appendChild(row);
  });
  list.appendChild(frag);
  filter.innerHTML = '<option value="ALL">全部</option>' + items.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}

function initReports(){
  const reload = document.getElementById('btnReloadReports');
  const cat = document.getElementById('filterCategory');
  const search = document.getElementById('filterSearch');
  const sort = document.getElementById('filterSort');
  reload.addEventListener('click', loadReports);
  cat.addEventListener('change', loadReports);
  search.addEventListener('change', loadReports);
  sort.addEventListener('change', loadReports);
  loadReports();
}

async function loadReports(){
  const cat = document.getElementById('filterCategory').value;
  const search = document.getElementById('filterSearch').value.trim();
  const sort = document.getElementById('filterSort').value;
  const params = new URLSearchParams();
  if (cat) params.set('category', cat);
  if (search) params.set('search', search);
  params.set('sort', sort);
  params.set('page','1'); params.set('page_size','50');
  const r = await api(`/api/reports?${params.toString()}`);
  const list = document.getElementById('reportsList'); list.innerHTML='';
  if (!r.ok){ list.textContent = (r.body && r.body.error) || '加载失败'; return; }
  const items = (r.body && r.body.items) || [];
  items.forEach(it => {
    const row = document.createElement('div'); row.style.border='1px solid #334155'; row.style.borderRadius='8px'; row.style.padding='10px'; row.style.margin='8px 0';
    const head = document.createElement('div'); head.style.display='flex'; head.style.justifyContent='space-between';
    head.innerHTML = `<b>${it.project_name}</b><span style="color:#94a3b8">${new Date(it.updated_at).toLocaleString()}</span>`;
    const actions = document.createElement('div'); actions.className='actions';
    const del = document.createElement('button'); del.className='btn'; del.textContent='删除'; del.onclick = async ()=>{ const rr = await api(`/api/reports?id=${encodeURIComponent(it.id)}`,'DELETE'); if (!rr.ok){ alert((rr.body&&rr.body.error)||'删除失败'); } await loadReports(); };
    const edit = document.createElement('button'); edit.className='btn'; edit.textContent='编辑JSON'; edit.onclick = ()=> editReportJson(it);
    const restore = document.createElement('button'); restore.className='btn'; restore.textContent='恢复上次编辑'; restore.onclick = async ()=>{ const rr = await api(`/api/reports?id=${encodeURIComponent(it.id)}&restore=1`,'POST'); if (!rr.ok){ alert((rr.body&&rr.body.error)||'恢复失败'); } await loadReports(); };
    actions.appendChild(edit); actions.appendChild(restore); actions.appendChild(del);
    const pre = document.createElement('pre'); pre.style.whiteSpace='pre-wrap'; pre.style.background='#0b1220'; pre.style.padding='10px'; pre.style.borderRadius='8px'; pre.textContent = toPreview(it);
    row.appendChild(head); row.appendChild(actions); row.appendChild(pre);
    list.appendChild(row);
  });
}

function editReportJson(it){
  const json = prompt('请输入要更新的 JSON（仅包含要修改的键）', JSON.stringify({ labels: it.labels, ai_rating: it.ai_rating }));
  if (!json) return;
  try{ const obj = JSON.parse(json); saveReportUpdate(it.id, obj); }catch(e){ alert('JSON 无效'); }
}

async function saveReportUpdate(id, obj){
  const r = await api(`/api/reports?id=${encodeURIComponent(id)}`,'PUT', obj);
  if (!r.ok){ alert((r.body&&r.body.error)||'更新失败'); return; }
  await loadReports();
}

function renameCategory(c){
  const html = `
    <div class="login-form-wrapper">
      <div class="input-group">
        <label>新的分类名称</label>
        <input id="renameCategoryName" type="text" class="clean-input" placeholder="请输入分类名称" value="${c.name}">
      </div>
      <div id="renameErr" class="error-text"></div>
    </div>
  `;
  showModal('重命名分类', html, async () => {
    const input = document.getElementById('renameCategoryName');
    const err = document.getElementById('renameErr');
    const name = (input.value||'').trim();
    if(!name){ err.textContent='请输入分类名称'; return false; }
    const r = await api('/api/categories','PUT',{ id:c.id, name });
    if(!r.ok){ err.textContent = (r.body&&r.body.error)||'重命名失败'; return false; }
    await loadCategories();
    await loadReports();
  });
  const btn = document.getElementById('modalConfirmBtn'); if(btn) btn.innerText='保存';
}

function deleteCategory(c){
  const html = `
    <div class="login-form-wrapper">
      <div class="input-group">
        <label>确认删除分类：${c.name}</label>
        <input type="text" class="clean-input" value="${c.id}" disabled>
      </div>
      <div class="error-text">删除后其下报告将归入“其他”。</div>
    </div>
  `;
  showModal('删除分类', html, async () => {
    if(c.id==='qita'){ showModal('提示','“其他”不可删除'); return; }
    const rr = await api(`/api/categories?id=${encodeURIComponent(c.id)}`,'DELETE');
    if (!rr.ok){ showModal('删除失败', (rr.body&&rr.body.error)||'删除失败'); return; }
    await loadCategories();
    await loadReports();
  });
  const btn = document.getElementById('modalConfirmBtn'); if(btn) btn.innerText='删除';
}
