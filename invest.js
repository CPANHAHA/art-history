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
});
