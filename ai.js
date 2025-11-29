(function(){
  if (!window.api) {
    window.api = async function(path, method, data){
      const opts = { method: method||'GET', headers:{ 'Content-Type':'application/json' }, credentials:'include' };
      if (data) opts.body = JSON.stringify(data);
      const resp = await fetch(path, opts);
      const ct = resp.headers.get('content-type')||'';
      const body = ct.includes('application/json') ? await resp.json() : await resp.text();
      return { ok: resp.ok, body };
    };
  }

  window.handleDelete = async function(categoryId){
    const url = '/api/categories?id=' + encodeURIComponent(categoryId);
    try {
      const res = await fetch(url, { method:'DELETE', credentials:'include' });
      if (res.ok) {
        if (Array.isArray(window.categories)) {
          window.categories = window.categories.filter(c => c.id !== categoryId);
        }
        if (typeof window.renderCategoryList === 'function') window.renderCategoryList();
        if (typeof window.renderTabs === 'function') window.renderTabs();
        if (typeof window.renderList === 'function') window.renderList();
        return;
      }
      let errorMsg = '操作失败 (' + res.status + ')';
      const ct = res.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const err = await res.json();
        errorMsg = err.error || errorMsg;
      }
      alert(errorMsg);
    } catch (err) {
      console.error('Delete error:', err);
      alert('网络错误');
    }
  };

  window.deleteCategory = window.handleDelete;

  async function refreshCategories(){
    try{
      const r = await window.api('/api/categories');
      const items = (r.ok && r.body && r.body.items) ? r.body.items : [];
      window.categories = items.map(c => ({ id:c.id, name:c.name }));
      if (typeof window.renderCategoryList === 'function') window.renderCategoryList();
      if (typeof window.renderTabs === 'function') window.renderTabs();
    }catch(e){ console.error('refreshCategories error', e); }
  }

  async function refreshReports(){
    try{
      const r = await window.api('/api/reports?page=1&page_size=200&sort=recent');
      const items = (r.ok && r.body && r.body.items) ? r.body.items : [];
      window.reports = items.map(it => ({
        id: it.id,
        category: it.category,
        created_at: it.created_at,
        last_updated_at: it.updated_at,
        is_deleted: !!it.deleted_at,
        current_version: 1,
        versions: [{ version:1, created_at: it.created_at, source:'backend', content: (it.content || {}) }]
      }));
      if (typeof window.renderList === 'function') window.renderList();
      if (typeof window.renderDetail === 'function') window.renderDetail();
    }catch(e){ console.error('refreshReports error', e); }
  }

  async function bootstrap(){
    await refreshCategories();
    await refreshReports();
  }

  document.addEventListener('DOMContentLoaded', bootstrap);

  function normalize(src){
    const o = JSON.parse(JSON.stringify(src||{}));
    o.project_name = o.project_name || '';
    o.ticker = o.ticker || '';
    if (typeof o.basic_info === 'string') o.basic_info = { summary:o.basic_info, core_features:[] };
    else o.basic_info = o.basic_info || { summary:'', core_features:[] };
    o.team = o.team || { description:'' };
    o.tokenomics = o.tokenomics || { description:'' };
    o.business_potential = o.business_potential || { analysis:'' };
    o.competitors = o.competitors || { summary:'', main_competitors:[] };
    o.focus_points = Array.isArray(o.focus_points) ? o.focus_points : [];
    o.ai_score = o.ai_score || {};
    o.meta = o.meta || { generated_at: new Date().toISOString(), source_url:'', notes:'' };
    return o;
  }

  window.confirmImport = async function(){
    try{
      if (!window.pendingImportData) return;
      const sel = document.getElementById('catSelect');
      let cid = sel && sel.value ? sel.value : 'qita';
      let cname = sel && sel.options && sel.selectedIndex>=0 ? sel.options[sel.selectedIndex].text : '';
      if (cid === '__NEW__'){
        cname = (document.getElementById('newCatInput')?.value||'').trim();
        if (!cname){ alert('请输入新分类名称'); return; }
        const cr = await window.api('/api/categories','POST',{ name: cname });
        if (!cr.ok){ alert((cr.body&&cr.body.error)||'创建失败'); return; }
        cid = (cr.body && cr.body.id) || cname.toLowerCase().replace(/\s+/g,'_');
      }
      const norm = normalize(window.pendingImportData);
      const pr = await window.api('/api/reports','POST',{ project_name: norm.project_name || window.pendingImportData.project_name, category: cid, content: norm, ticker: norm.ticker });
      if (!pr.ok){ alert((pr.body&&pr.body.error)||'保存失败'); return; }
      await refreshCategories();
      await refreshReports();
      window.pendingImportData = null;
      const it = document.getElementById('importText'); if (it) it.value='';
      const mc = document.getElementById('modalCategory'); if (mc) mc.style.display='none';
      const mi = document.getElementById('modalImport'); if (mi) mi.style.display='none';
    }catch(e){ console.error('confirmImport error', e); }
  };

  window.refreshCategories = refreshCategories;
  window.refreshReports = refreshReports;

  window.updatePrompt = function(){
    try {
      const name = (document.getElementById('pName')?.value||'').trim();
      const ticker = (document.getElementById('pTicker')?.value||'').trim();
      const web = (document.getElementById('pWeb')?.value||'').trim();
      const tw = (document.getElementById('pTw')?.value||'').trim();
      const note = (document.getElementById('pNote')?.value||'').trim();
      const msgEl = document.getElementById('pMsg');
      const outEl = document.getElementById('pOutput');
      if (!name || !ticker){ if(msgEl){ msgEl.textContent='项目名称和Ticker为必填项！'; msgEl.style.color='var(--color-bad)'; } if(outEl) outEl.value=''; return; }
      if (msgEl) msgEl.textContent='';
      const ts = new Date().toISOString();
      const parts = [];
      parts.push('请分析以下项目，并以JSON格式输出投研报告：');
      parts.push('项目名称: ' + name);
      parts.push('Ticker/代币符号: ' + ticker);
      if (web) parts.push('官网: ' + web);
      if (tw) parts.push('X: ' + tw);
      if (note) parts.push('补充资料/备注: ' + note);
      parts.push('');
      parts.push('[以下是JSON报告格式要求，请严格遵循]');
      parts.push('{');
      parts.push('  "project_name": "' + name + '",');
      parts.push('  "ticker": "' + ticker + '",');
      parts.push('  "focus_points": [ "从代币投资视角出发，当下最需要重点关注的要点，1 条一项，建议 3-7 条", "……" ],');
      parts.push('  "ai_score": {');
      parts.push('    "overall": 0.0,');
      parts.push('    "base_info_reliability": 0.0,');
      parts.push('    "narrative_fit": 0.0,');
      parts.push('    "product_and_tech": 0.0,');
      parts.push('    "team_strength": 0.0,');
      parts.push('    "market_potential": 0.0,');
      parts.push('    "score_explanation": "用几句话解释打分的核心逻辑，说明总分是如何由各维度相加得出的"');
      parts.push('  },');
      parts.push('  "launchpad": "字符串，launchpad 平台，如信息不足请填 \"信息不足（需人工补充）\"",');
      parts.push('  "tagline": "标签：一句话短句，概括项目的核心定位，例如：\"面向 DeFi 的 AI 风控基础设施\"。如信息不足，请写 \"信息不足\"。",');
      parts.push('  "basic_info": {');
      parts.push('    "summary": "项目介绍的整体概述，1-2 段。",');
      parts.push('    "core_features": [ "核心特点 1", "核心特点 2" ]');
      parts.push('  },');
      parts.push('  "team": {');
      parts.push('    "description": "团队背景总结。",');
      parts.push('    "is_ai_inferred": false');
      parts.push('  },');
      parts.push('  "tokenomics": {');
      parts.push('    "description": "代币机制/功能介绍，如信息不足则说明 \"信息不足\"。",');
      parts.push('    "is_ai_inferred": false');
      parts.push('  },');
      parts.push('  "business_potential": {');
      parts.push('    "analysis": "从商业落地和盈利模式角度的分析。",');
      parts.push('    "is_ai_inferred": false');
      parts.push('  },');
      parts.push('  "competitors": {');
      parts.push('    "summary": "竞品简介",');
      parts.push('    "main_competitors": [ "竞品项目名称 1（如有）" ],');
      parts.push('    "is_ai_inferred": false');
      parts.push('  },');
      parts.push('  "current_progress_and_roadmap": {');
      parts.push('    "current_status": "当前状态",');
      parts.push('    "future_plan": "未来计划"');
      parts.push('  },');
      parts.push('  "meta": {');
      parts.push('    "generated_at": "' + ts + '",');
      parts.push('    "source_url": "",');
      parts.push('    "notes": "用户备注: ' + (note||'') + '"');
      parts.push('  }');
      parts.push('}');
      const txt = parts.join('\n');
      if (outEl) outEl.value = txt;
    } catch(e) {
      console.error('updatePrompt error', e);
    }
  };
})();
