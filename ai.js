(function(){
  // ============================================
  // 0. State & Globals
  // ============================================
  window.reports = [];
  window.categories = [];
  window.currentReportId = null;
  window.currentCatFilter = 'ALL';
  window.currentSort = 'updated';
  window.pendingImportData = null;
  window.isEditing = false;

  // ============================================
  // 1. API Helper
  // ============================================
  window.api = window.api || async function(path, method, data){
    const opts = { method: method||'GET', headers:{ 'Content-Type':'application/json' }, credentials:'include' };
    if (data) opts.body = JSON.stringify(data);
    const resp = await fetch(path, opts);
    const ct = resp.headers.get('content-type')||'';
    const body = ct.includes('application/json') ? await resp.json() : await resp.text();
    return { ok: resp.ok, body };
  };

  // ============================================
  // 2. Data Loading
  // ============================================
  window.loadData = async function(){
    try {
      // Load Categories
      const cats = await window.api('/api/categories');
      window.categories = (cats.ok && cats.body && cats.body.items) ? cats.body.items.map(c=>({ id:c.id, name:c.name })) : [];
      
      // Load Reports
      const r = await window.api('/api/reports?page=1&page_size=200&sort=recent');
      const items = (r.ok && r.body && r.body.items) ? r.body.items : [];
      
      window.reports = items.map(it => ({
        id: it.id,
        category: it.category,
        created_at: it.created_at,
        last_updated_at: it.updated_at,
        is_deleted: !!it.deleted_at,
        current_version: 1, // Simplified version tracking for list view
        versions: [{ 
          version: 1, 
          created_at: it.created_at, 
          source: 'backend', 
          content: normalizeContent(it.content || {}) 
        }]
      }));

      // Restore selection if possible
      if (window.currentReportId && !window.reports.find(r => r.id === window.currentReportId)) {
        window.currentReportId = null;
      }
    } catch (e) {
      console.error('loadData error', e);
    }
  };

  // Helper to get current report object
  window.getReport = function(id) { return window.reports.find(r => r.id === id); };
  
  // Helper to get current content
  window.getContent = function(report) { 
    if (!report || !report.versions || !report.versions.length) return null;
    // In this simplified frontend model, we just take the first version as "current" 
    // because backend returns the latest state in 'content' field which we wrapped in versions[0]
    return report.versions[0].content; 
  };

  function normalizeContent(src){
    const out = JSON.parse(JSON.stringify(src||{}));
    out.project_name = out.project_name || out.projectName || '';
    out.ticker = out.ticker || '';
    out.launchpad = out.launchpad || out.launchpad_platform || '';
    
    if (typeof out.basic_info === 'string'){
      out.basic_info = { summary: out.basic_info, core_features: [] };
    } else {
      out.basic_info = out.basic_info || { summary:'', core_features: [] };
    }
    
    // Normalize score
    const s = out.ai_score || {}; 
    out.ai_score = {
      overall: parseFloat(s.overall)||0,
      base_info_reliability: parseFloat(s.base_info_reliability)||0,
      narrative_fit: parseFloat(s.narrative_fit)||0,
      product_and_tech: parseFloat(s.product_and_tech)||0,
      team_strength: parseFloat(s.team_strength)||0,
      market_potential: parseFloat(s.market_potential)||0,
      score_explanation: s.score_explanation || ''
    };
    
    out.focus_points = Array.isArray(out.focus_points)? out.focus_points : [];
    out.meta = out.meta || { generated_at: new Date().toISOString(), source_url:'', notes:'' };

    // Build detailed_analysis if missing (Backward Compatibility)
    if (!out.detailed_analysis) {
        let parts = [];
        if (out.team && out.team.description) parts.push(`### 团队背景\n${out.team.description}`);
        if (out.tokenomics && out.tokenomics.description) parts.push(`### 代币经济\n${out.tokenomics.description}`);
        if (out.business_potential && out.business_potential.analysis) parts.push(`### 商业潜力\n${out.business_potential.analysis}`);
        if (out.competitors) {
             let cText = out.competitors.summary || '';
             if (out.competitors.main_competitors && out.competitors.main_competitors.length) {
                 cText += '\n\n**主要竞品:**\n' + out.competitors.main_competitors.map(x=>`- ${x}`).join('\n');
             }
             if (cText) parts.push(`### 竞品分析\n${cText}`);
        }
        if (out.current_progress_and_roadmap) {
            let rText = '';
            if(out.current_progress_and_roadmap.current_status) rText += `**当前状态:** ${out.current_progress_and_roadmap.current_status}\n`;
            if(out.current_progress_and_roadmap.future_plan) rText += `**未来计划:** ${out.current_progress_and_roadmap.future_plan}`;
            if (rText) parts.push(`### 进度与路线图\n${rText}`);
        }
        out.detailed_analysis = parts.join('\n\n');
    }

    return out;
  }

  // ============================================
  // 2.1 Card Renderer
  // ============================================
  window.renderReportCards = function(text) {
    if (!text) return '';
    if (typeof marked === 'undefined') return `<div class="content-section"><div class="content-text"><pre>${text}</pre></div></div>`;
    
    const getCardClass = (title) => {
      if (title.includes('团队')) return 'card-team';
      if (title.includes('代币') || title.includes('模型') || title.includes('经济')) return 'card-token';
      if (title.includes('商业') || title.includes('潜力') || title.includes('盈利')) return 'card-business';
      if (title.includes('竞品') || title.includes('竞争')) return 'card-competitors';
      if (title.includes('路线') || title.includes('进展') || title.includes('规划')) return 'card-roadmap';
      return '';
    };

    const lines = text.split('\n');
    let html = '';
    let currentTitle = '';
    let currentContent = [];
    
    const flush = () => {
      if (!currentTitle && currentContent.length === 0) return;
      const contentMd = currentContent.join('\n').trim();
      if (!contentMd && !currentTitle) return;
      
      const cls = getCardClass(currentTitle);
      const parsed = marked.parse(contentMd);
      
      html += `<div class="report-card ${cls}">
        ${currentTitle ? `<h3>${currentTitle}</h3>` : ''}
        ${parsed}
      </div>`;
    };

    lines.forEach(line => {
      // Support ## or ###, with optional space
      const match = line.trim().match(/^(#{2,3})\s*(.+)$/);
      if (match) {
        flush();
        currentTitle = match[2].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    });
    flush();
    
    return html;
  };

  // ============================================
  // 3. Rendering
  // ============================================
  window.renderTabs = function(){
    const el = document.getElementById('categoryTabs');
    if (!el) return;
    el.innerHTML = '';
    
    const sortedCats = [...window.categories].sort((a,b)=>{
      if (a.id==='qita' && b.id!=='qita') return 1;
      if (b.id==='qita' && a.id!=='qita') return -1;
      return String(a.name).localeCompare(String(b.name));
    });
    
    const all = [{ id: 'ALL', name: '全部' }, ...sortedCats];
    all.forEach(c => {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${c.id === window.currentCatFilter ? 'active' : ''}`;
      btn.textContent = c.name;
      btn.onclick = () => {
        window.currentCatFilter = c.id;
        window.renderTabs();
        window.renderList();
      };
      el.appendChild(btn);
    });
  };

  window.renderList = function(){
    const el = document.getElementById('reportList');
    if (!el) return;
    el.innerHTML = '';
    
    let list = window.reports.filter(r => !r.is_deleted);
    if (window.currentCatFilter !== 'ALL') {
      list = list.filter(r => r.category === window.currentCatFilter);
    }

    // Search
    const key = document.getElementById('searchInput')?.value.trim().toLowerCase();
    if (key) {
      list = list.filter(r => {
        const c = window.getContent(r);
        return c && (c.project_name.toLowerCase().includes(key) || c.ticker.toLowerCase().includes(key));
      });
    }

    // Sort
    list.sort((a, b) => {
      if (window.currentSort === 'updated') return (b.last_updated_at||'').localeCompare(a.last_updated_at||'');
      const sa = window.getContent(a)?.ai_score?.overall || 0;
      const sb = window.getContent(b)?.ai_score?.overall || 0;
      return sb - sa;
    });

    if (list.length === 0) {
      el.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-dim);">未找到项目</div>';
      return;
    }

    list.forEach(r => {
      const c = window.getContent(r);
      if (!c) return;
      
      const div = document.createElement('div');
      div.className = `list-item ${r.id === window.currentReportId ? 'active' : ''}`;
      div.onclick = () => {
        window.currentReportId = r.id;
        window.isEditing = false;
        window.renderList();
        window.renderDetail();
        const ms = document.getElementById('mainScroll');
        if (ms) ms.scrollTop = 0;
      };

      const score = c.ai_score?.overall || 0;
      let scoreClass = 'score-none';
      if (score >= 4.0) scoreClass = 'score-high';
      else if (score >= 3.0) scoreClass = 'score-mid';
      else if (score > 0) scoreClass = 'score-low';

      div.innerHTML = `
        <div class="item-main">
          <div class="item-title">${c.project_name}</div>
          <div class="item-meta">
            <span>${c.ticker || '-'}</span>
            <span>•</span>
            <span>${(r.last_updated_at||'').slice(5, 10)}</span>
          </div>
        </div>
        <div class="score-badge-mini ${scoreClass}">${score > 0 ? score.toFixed(1) : '-'}</div>
      `;
      el.appendChild(div);
    });
  };

  window.renderDetail = function(){
    const el = document.getElementById('detailContainer');
    if (!el) return;

    if (!window.currentReportId) {
      el.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 48px; margin-bottom:16px; opacity:0.2;">📂</div>
          <p>请在左侧选择一个项目</p>
        </div>`;
      return;
    }

    const report = window.getReport(window.currentReportId);
    const c = window.getContent(report);
    
    if (!c) {
      el.innerHTML = `<div class="empty-state"><p>数据加载错误</p></div>`;
      return;
    }

    if (window.isEditing) {
      window.renderEditMode(report, c);
      return;
    }

    const score = c.ai_score?.overall || 0;
    const scoreColor = score >= 4.0 ? '#22c55e' : (score >= 3.0 ? '#eab308' : '#ef4444');
    const scoreClass = score >= 4.0 ? 'score-high' : (score >= 3.0 ? 'score-mid' : (score > 0 ? 'score-low' : 'score-none'));

    // Helper for sections
    const renderSection = (title, contentHTML, editable, className = '') => `
      <div class="content-section ${className}">
        <div class="section-title">${title} ${editable ? `<button class="btn edit-inline" onclick="toggleEdit()" title="编辑内容">✏️</button>` : ''}</div>
        <div class="content-text">${contentHTML}</div>
      </div>`;

    let html = `
      <div class="hero-header">
        <div class="hero-top-row">
          <h1 class="hero-title" style="color:${scoreColor}">AI 报告</h1>
          <div class="hero-actions">
            <button class="btn" onclick="toggleEdit()" title="编辑报告">✏️ 编辑</button>
            <button class="btn" onclick="exportJSON()" title="导出JSON">⬇</button>
            <button class="btn pdf-download-btn" onclick="downloadPDF()" title="下载PDF报告">📄 PDF</button>
            <button class="btn btn-icon-only" onclick="deleteReport()" title="删除" style="color:var(--color-bad);border-color:rgba(239,68,68,0.3);">🗑</button>
          </div>
        </div>
        <h1 class="hero-title">
          ${c.project_name} 
          <span class="ticker-pill">${c.ticker || 'N/A'}</span>
        </h1>
        ${c.tagline ? `<div class="tagline-box">${c.tagline}</div>` : ''}
        <div class="hero-links">
          ${c.project_twitter && c.project_twitter !== '未知' ? `<a href="https://twitter.com/${c.project_twitter.replace('@','')}" target="_blank">X</a>` : ''}
          ${c.project_website && c.project_website !== '未知' ? `<a href="${c.project_website}" target="_blank">Website</a>` : ''}
          <span class="launchpad-info"> 
            Launchpad: ${c.launchpad || '未设置'} 
            <button class="btn-icon-only edit-inline" onclick="editLaunchpad()" title="编辑Launchpad" style="margin-left: 4px; padding: 2px; font-size: 12px;">✏️</button>
          </span>
        </div>
      </div>
    `;

    // Basic Info
    if (c.basic_info) {
      let txt = `<p>${c.basic_info.summary || '暂无简介'}</p>`;
      if (c.basic_info.core_features?.length) {
        txt += `<div class="feature-tags">${c.basic_info.core_features.map(x=>`<div class="feature-tag">${x}</div>`).join('')}</div>`;
      }
      html += renderSection('项目简介', txt, false, 'section-hero');
    }

    // Focus Points
    if (c.focus_points && c.focus_points.length > 0) {
      html += `
        <div class="focus-card">
          <div class="focus-title">🔥 当下重点关注</div>
          <ul class="focus-list">
            ${c.focus_points.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // AI Score
    if (c.ai_score) {
      const s = c.ai_score;
      html += `
        <div class="content-section ai-score-section" style="border-left: 4px solid ${scoreColor};">
          <div class="section-title">AI 综合评分: <span class="${scoreClass}" style="font-size:24px; padding: 0 8px; border-radius: 4px;">${(s.overall || 0).toFixed(1)}/5.0</span></div>
          <div class="radar-container">
            <canvas id="radarChart" class="radar-canvas"></canvas>
          </div>
          <div class="score-explanation">
            <strong>评分说明:</strong> ${s.score_explanation || '暂无说明'}
          </div>
          <div class="radar-legend">
              <div class="legend-item"><div class="legend-color" style="background:#38bdf8;"></div>基础信息: ${(s.base_info_reliability||0).toFixed(2)}</div>
              <div class="legend-item"><div class="legend-color" style="background:#22c55e;"></div>叙事匹配: ${(s.narrative_fit||0).toFixed(2)}</div>
              <div class="legend-item"><div class="legend-color" style="background:#eab308;"></div>产品技术: ${(s.product_and_tech||0).toFixed(2)}</div>
              <div class="legend-item"><div class="legend-color" style="background:#a855f7;"></div>团队实力: ${(s.team_strength||0).toFixed(2)}</div>
              <div class="legend-item"><div class="legend-color" style="background:#ef4444;"></div>市场潜力: ${(s.market_potential||0).toFixed(2)}</div>
          </div>
        </div>
      `;
    }

    if (c.detailed_analysis) {
      html += window.renderReportCards(c.detailed_analysis);
    }
    
    if (c.meta) {
      html += `
        <div style="margin-top: 40px; border-top: 1px dashed var(--border); padding-top: 20px; font-size: 13px; color: var(--text-dim);">
          报告元数据: <br/>
          生成时间: ${c.meta.generated_at || '-'} <br/>
          ${c.meta.notes ? '备注: '+c.meta.notes : ''}
        </div>
      `;
    }

    el.innerHTML = html;
    
    if (c.ai_score) {
      setTimeout(() => { window.renderRadarChart(c.ai_score); }, 100);
    }
  };

  window.renderRadarChart = function(scoreData) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const width = canvas.width = canvas.offsetWidth || 600;
    const height = canvas.height = canvas.offsetHeight || 300;
    const ctx = canvas.getContext('2d');
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.35;
    const dimensions = [
      { name: '基础信息', color: '#38bdf8', key: 'base_info_reliability' },
      { name: '叙事匹配', color: '#22c55e', key: 'narrative_fit' },
      { name: '产品技术', color: '#eab308', key: 'product_and_tech' },
      { name: '团队实力', color: '#a855f7', key: 'team_strength' },
      { name: '市场潜力', color: '#ef4444', key: 'market_potential' }
    ];
    const values = dimensions.map(d => (scoreData && typeof scoreData[d.key] === 'number') ? scoreData[d.key] : 0);
    const axisCount = dimensions.length;
    const angleSlice = (Math.PI * 2) / axisCount;

    ctx.clearRect(0, 0, width, height);
    // Grid
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    for (let lvl = 5; lvl >= 1; lvl--) {
      const r = (maxRadius * lvl) / 5;
      ctx.beginPath();
      for (let i = 0; i < axisCount; i++) {
        const angle = angleSlice * i - Math.PI / 2;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    // Axes
    ctx.strokeStyle = '#475569';
    for (let i = 0; i < axisCount; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + maxRadius * Math.cos(angle), centerY + maxRadius * Math.sin(angle));
      ctx.stroke();
    }
    // Data
    ctx.beginPath();
    for (let i = 0; i < axisCount; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      const r = Math.max(0, Math.min(1, values[i])) * maxRadius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,0.12)'; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
    ctx.fill(); ctx.stroke();
    // Points & Labels
    for (let i = 0; i < axisCount; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      const r = Math.max(0, Math.min(1, values[i])) * maxRadius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      ctx.beginPath(); ctx.fillStyle = dimensions[i].color;
      ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.stroke();
      
      const scoreText = (values[i] || 0).toFixed(2);
      const labelRadius = maxRadius + 28;
      const lx = centerX + labelRadius * Math.cos(angle);
      const ly = centerY + labelRadius * Math.sin(angle);
      
      ctx.font = '12px Arial'; ctx.fillStyle = '#f1f5f9'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(dimensions[i].name, lx, ly);
      ctx.font = '13px Arial'; ctx.fillStyle = dimensions[i].color;
      ctx.fillText(scoreText, lx, ly + 16);
    }
  };

  window.renderEditMode = function(report, c) {
    const el = document.getElementById('detailContainer');
    if (!el) return;
    
    const mkInput = (lbl, val, id) => `
      <div class="form-group">
        <label class="form-label">${lbl}</label>
        <input id="e_${id}" class="form-input" value="${(val||'').replace(/"/g, '&quot;')}" />
      </div>`;
    const mkText = (lbl, val, id) => `
      <div class="form-group">
        <label class="form-label">${lbl}</label>
        <textarea id="e_${id}" class="form-textarea">${(val||'')}</textarea>
      </div>`;
    
    el.innerHTML = `
      <div class="hero-header">
        <div class="hero-top-row">
          <h1 class="hero-title" style="font-size:24px;">编辑模式</h1>
          <div class="hero-actions">
            <button class="btn" onclick="toggleEdit()">取消</button>
            <button class="btn btn-primary" onclick="saveEdit()">保存版本</button>
          </div>
        </div>
        <div class="alert-box">修改后保存将生成新的历史版本</div>
      </div>
      <div class="container-limit" style="max-width:800px;">
        <div class="edit-grid" style="grid-template-columns:1fr 1fr;">
          ${mkInput('项目名称', c.project_name, 'pname')}
          ${mkInput('Ticker', c.ticker, 'ticker')}
          ${mkInput('官网', c.project_website, 'web')}
          ${mkInput('X', c.project_twitter, 'tw')}
        </div>
        ${mkInput('Tagline (一句话标签)', c.tagline, 'tag')}
        ${mkInput('Launchpad', c.launchpad, 'launch')}
        <div style="margin:20px 0; border-top:1px solid var(--border);"></div>
        <h3 style="color:var(--text-muted)">AI 评分 (0-1)</h3>
        <div class="edit-grid" style="grid-template-columns:1fr 1fr 1fr;">
          ${mkInput('总分 (0-5)', (c.ai_score?.overall || 0).toFixed(1), 's_all')}
          ${mkInput('基础信息 (0-1)', (c.ai_score?.base_info_reliability || 0).toFixed(2), 's_base')}
          ${mkInput('叙事 (0-1)', (c.ai_score?.narrative_fit || 0).toFixed(2), 's_narr')}
          ${mkInput('产品 (0-1)', (c.ai_score?.product_and_tech || 0).toFixed(2), 's_prod')}
          ${mkInput('团队 (0-1)', (c.ai_score?.team_strength || 0).toFixed(2), 's_team')}
          ${mkInput('市场 (0-1)', (c.ai_score?.market_potential || 0).toFixed(2), 's_mkt')}
        </div>
        ${mkText('评分解释', c.ai_score?.score_explanation, 's_exp')}
        <div style="margin:20px 0; border-top:1px solid var(--border);"></div>
        <h3 style="color:var(--text-muted)">内容详情</h3>
        ${mkText('项目简介 (Summary)', c.basic_info?.summary, 'info_sum')}
        ${mkInput('核心特性 (用逗号分隔)', c.basic_info?.core_features?.join(', '), 'info_feat')}
        ${mkText('当下重点关注 (一行一项)', c.focus_points?.join('\n'), 'focus')}
        ${mkText('团队背景', c.team?.description, 'team_desc')}
        ${mkText('代币经济', c.tokenomics?.description, 'token_desc')}
        ${mkText('商业潜力分析', c.business_potential?.analysis, 'biz_an')}
      </div>
    `;
  };

  // ============================================
  // 4. Actions
  // ============================================
  window.toggleEdit = function(){
    window.isEditing = !window.isEditing;
    window.renderDetail();
  };

  window.saveEdit = async function(){
    const report = window.getReport(window.currentReportId);
    if (!report) return;
    const oldC = window.getContent(report) || {};
    const newC = JSON.parse(JSON.stringify(oldC));
    const gv = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const gp = (id) => { const el = document.getElementById(id); return el ? parseFloat(el.value)||0 : 0; };
    
    newC.project_name = gv('e_pname');
    newC.ticker = gv('e_ticker');
    newC.tagline = gv('e_tag');
    newC.project_website = gv('e_web');
    newC.project_twitter = gv('e_tw');
    newC.launchpad = gv('e_launch');
    newC.ai_score = newC.ai_score || {};
    newC.ai_score.overall = gp('e_s_all');
    newC.ai_score.base_info_reliability = gp('e_s_base');
    newC.ai_score.narrative_fit = gp('e_s_narr');
    newC.ai_score.product_and_tech = gp('e_s_prod');
    newC.ai_score.team_strength = gp('e_s_team');
    newC.ai_score.market_potential = gp('e_s_mkt');
    newC.ai_score.score_explanation = gv('e_s_exp');
    newC.basic_info = newC.basic_info || {};
    newC.basic_info.summary = gv('e_info_sum');
    const coreFeaturesStr = gv('e_info_feat');
    newC.basic_info.core_features = coreFeaturesStr ? coreFeaturesStr.split(',').map(s=>s.trim()).filter(Boolean) : [];
    const focusStr = gv('e_focus');
    newC.focus_points = focusStr ? focusStr.split('\n').map(s=>s.trim()).filter(Boolean) : [];
    newC.team = newC.team || {};
    newC.team.description = gv('e_team_desc');
    newC.tokenomics = newC.tokenomics || {};
    newC.tokenomics.description = gv('e_token_desc');
    newC.business_potential = newC.business_potential || {};
    newC.business_potential.analysis = gv('e_biz_an');

    try {
      const r = await window.api(`/api/reports?id=${encodeURIComponent(window.currentReportId)}`,'PUT',{ content: newC });
      if (!r.ok){ alert((r.body&&r.body.error)||'更新失败'); return; }
      window.isEditing = false;
      await window.loadData();
      window.renderTabs();
      window.renderList();
      window.renderDetail();
    } catch(e) { alert('保存出错'); console.error(e); }
  };

  window.deleteReport = async function(){
    if (!confirm('确定删除此报告吗？')) return;
    const r = await window.api(`/api/reports?id=${encodeURIComponent(window.currentReportId)}`,'DELETE');
    if (!r.ok){ alert((r.body&&r.body.error)||'删除失败'); return; }
    window.currentReportId = null;
    await window.loadData();
    window.renderTabs();
    window.renderList();
    window.renderDetail();
  };

  window.exportJSON = function(){
    const report = window.getReport(window.currentReportId);
    const c = window.getContent(report);
    if (!c) return;
    const blob = new Blob([JSON.stringify(c, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${c.project_name}_report.json`;
    a.click();
  };
  
  // ============================================
  // 5. PDF Download
  // ============================================
  window.downloadPDF = function() {
    if (!window.currentReportId) { alert('请先选择一个项目'); return; }
    const detailContent = document.getElementById('detailContainer');
    const pdfContainer = detailContent.cloneNode(true);
    pdfContainer.querySelectorAll('.hero-actions, .edit-inline').forEach(el => el.remove());
    pdfContainer.querySelector('.launchpad-info button')?.remove();
    pdfContainer.id = 'pdf-temp-container';
    pdfContainer.style.maxWidth = '900px';
    pdfContainer.style.margin = '0 auto';
    pdfContainer.style.padding = '30px';
    pdfContainer.style.background = '#ffffff';
    pdfContainer.style.color = '#333';
    pdfContainer.querySelectorAll('.content-text p, .content-text li').forEach(el => el.style.color = '#333');
    pdfContainer.querySelectorAll('.section-title').forEach(el => el.style.color = '#000');
    pdfContainer.querySelectorAll('.score-explanation').forEach(el => { el.style.background = '#f0f9ff'; el.style.border = '1px solid #bae6fd'; });
    pdfContainer.querySelectorAll('.content-section').forEach(el => { el.style.background = '#f7f7f7'; el.style.border = '1px solid #e0e0e0'; });
    pdfContainer.querySelectorAll('.hero-title').forEach(el => el.style.color = '#000');
    document.body.appendChild(pdfContainer);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth() - 2 * margin;

    const canvasElement = pdfContainer.querySelector('#radarChart');
    if (canvasElement) {
      const report = window.getReport(window.currentReportId);
      const scoreData = window.getContent(report)?.ai_score || {};
      const ctx = canvasElement.getContext('2d');
      const width = canvasElement.width = canvasElement.offsetWidth;
      const height = canvasElement.height = canvasElement.offsetHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.38;
      ctx.clearRect(0, 0, width, height);
      const dimensions = [
        { key: 'base_info_reliability', label: '基础信息', color: '#38bdf8' },
        { key: 'narrative_fit', label: '叙事匹配', color: '#22c55e' },
        { key: 'product_and_tech', label: '产品技术', color: '#eab308' },
        { key: 'team_strength', label: '团队实力', color: '#a855f7' },
        { key: 'market_potential', label: '市场潜力', color: '#ef4444' }
      ];
      const values = dimensions.map(d => (scoreData[d.key] || 0));
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'; ctx.lineWidth = 1;
      for (let i = 1; i <= 5; i++) { ctx.beginPath(); ctx.arc(centerX, centerY, radius * (i / 5), 0, Math.PI * 2); ctx.stroke(); }
      dimensions.forEach((dim, i) => {
        const angle = (Math.PI * 2 * i / dimensions.length) - Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius); ctx.stroke();
        ctx.fillStyle = '#333'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(dim.label, centerX + Math.cos(angle) * (radius + 25), centerY + Math.sin(angle) * (radius + 25));
      });
      ctx.beginPath(); ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'; ctx.fillStyle = 'rgba(56, 189, 248, 0.3)'; ctx.lineWidth = 2;
      dimensions.forEach((dim, i) => {
        const angle = (Math.PI * 2 * i / dimensions.length) - Math.PI / 2;
        const r = radius * (values[i]||0);
        if (i === 0) ctx.moveTo(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r);
        else ctx.lineTo(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r);
      });
      ctx.closePath(); ctx.stroke(); ctx.fill();
      dimensions.forEach((dim, i) => {
        const angle = (Math.PI * 2 * i / dimensions.length) - Math.PI / 2;
        const r = radius * (values[i]||0);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        ctx.fillStyle = dim.color; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dim.color; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((values[i]||0).toFixed(2), x, y - 16);
      });
    }

    html2canvas(pdfContainer, { allowTaint: true, useCORS: true, scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth;
      const pageHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = pageHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, pageHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft >= 0) {
        position = heightLeft - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position + margin, imgWidth, pageHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      const reportName = window.getContent(window.getReport(window.currentReportId))?.project_name || 'AI_Report';
      pdf.save(`${reportName}_Report.pdf`);
      document.body.removeChild(pdfContainer);
      const report = window.getReport(window.currentReportId);
      if (report && report.ai_score) window.renderRadarChart(report.ai_score);
    });
  };

  // ============================================
  // 6. Modals & Helpers
  // ============================================
  window.openModal = function(id){ const el = document.getElementById(id); if (el) el.style.display='flex'; };
  window.closeModal = function(id){ const el = document.getElementById(id); if (el) el.style.display='none'; };
  
  window.editLaunchpad = function(){
    const report = window.getReport(window.currentReportId);
    const c = window.getContent(report);
    if(c) document.getElementById('launchpadInput').value = c.launchpad || '';
    window.openModal('modalLaunchpad');
  };
  
  window.saveLaunchpad = function(){
    const el = document.getElementById('launchpadInput');
    if(el){
      // This just updates the input for saving later? 
      // No, user expects "Save" to persist.
      // Reusing saveEdit logic partially or direct update
      // For simplicity, we treat it like a mini-edit.
      // But wait, saveEdit reads from the BIG edit form.
      // So we need a specific save.
      const report = window.getReport(window.currentReportId);
      if(!report) return;
      const c = window.getContent(report);
      c.launchpad = el.value.trim();
      // We need to persist this change.
      // Let's use a quick PUT
      window.api(`/api/reports?id=${encodeURIComponent(window.currentReportId)}`,'PUT',{ content: c })
        .then(r => {
          if(r.ok) { window.closeModal('modalLaunchpad'); window.renderDetail(); }
          else alert('保存失败');
        });
    }
  };

  // ============================================
  // 7. Import & Categories
  // ============================================
  window.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const el = document.getElementById('importText');
      if (el) el.value = e.target.result;
      const msg = document.getElementById('importMsg');
      if (msg) { msg.textContent = '文件读取成功，请点击"解析并下一步"'; msg.style.color = 'var(--color-good)'; }
    };
    reader.readAsText(file);
  };
  
  window.handleDrop = function(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.json')) {
        const inp = document.getElementById('jsonFileInput');
        if (inp) { inp.files = files; inp.dispatchEvent(new Event('change')); }
      } else {
        const msg = document.getElementById('importMsg');
        if (msg) { msg.textContent = '请拖放JSON格式的文件'; msg.style.color = 'var(--color-bad)'; }
      }
    }
  };

  window.parseImport = function(){
    const text = document.getElementById('importText')?.value.trim();
    const msg = document.getElementById('importMsg');
    if(msg) msg.textContent = '';
    window.pendingImportData = null;
    try {
      const data = JSON.parse(text);
      if (!data.project_name || !data.ticker) throw new Error('JSON缺少 project_name 或 ticker 字段。');
      window.pendingImportData = data;
      const catSelect = document.getElementById('catSelect');
      if(catSelect) {
        catSelect.innerHTML = window.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('') + '<option value="__NEW__">--- 创建新分类 ---</option>';
      }
      const grp = document.getElementById('newCatGroup');
      if(grp) grp.style.display = 'none';
      window.closeModal('modalImport');
      window.openModal('modalCategory');
    } catch (e) {
      if(msg) { msg.textContent = 'JSON解析错误：' + e.message; msg.style.color = 'var(--color-bad)'; }
    }
  };

  window.confirmImport = async function(){
    if (!window.pendingImportData) return;
    const catSelect = document.getElementById('catSelect');
    let categoryId = catSelect.value;
    let categoryName = catSelect.options[catSelect.selectedIndex].text;
    
    if (categoryId === '__NEW__'){
      categoryName = document.getElementById('newCatInput').value.trim();
      if (!categoryName){ alert('请输入新分类名称'); return; }
      const cr = await window.api('/api/categories','POST',{ name: categoryName });
      if (!cr.ok){ alert((cr.body&&cr.body.error)||'分类创建失败'); return; }
      categoryId = (cr.body && cr.body.id);
    }
    
    const norm = normalizeContent(window.pendingImportData);
    const payload = { 
      project_name: norm.project_name || window.pendingImportData.project_name, 
      category: categoryId, 
      content: norm, 
      ticker: norm.ticker, 
      launchpad: norm.launchpad 
    };
    
    const pr = await window.api('/api/reports','POST', payload);
    if (!pr.ok){ alert((pr.body&&pr.body.error)||'保存失败'); return; }
    
    await window.loadData();
    window.currentReportId = pr.body && pr.body.id;
    window.currentCatFilter = categoryId;
    window.renderTabs();
    window.renderList();
    window.renderDetail();
    window.pendingImportData = null;
    const it = document.getElementById('importText'); if(it) it.value='';
    window.closeModal('modalCategory');
    window.closeModal('modalImport');
  };

  // Category Management
  window.openCategoryManage = function() {
    window.renderCategoryList();
    window.openModal('modalCategoryManage');
  };

  window.renderCategoryList = function() {
    const container = document.getElementById('categoryList');
    if(!container) return;
    container.innerHTML = '';
    const sorted = [...window.categories].sort((a,b)=>{
      if (a.id==='qita' && b.id!=='qita') return 1;
      if (b.id==='qita' && a.id!=='qita') return -1;
      return String(a.name).localeCompare(String(b.name));
    });
    sorted.forEach((cat) => {
      const projectCount = window.reports.filter(r => r.category === cat.id && !r.is_deleted).length;
      const div = document.createElement('div');
      div.className = 'list-item';
      div.style.marginBottom = '8px';
      div.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:500;">${cat.name}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">项目数: ${projectCount}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn-icon-only edit-inline" title="编辑" onclick="editCategory('${cat.id}')">✏️</button>
          ${(cat.id!=='qita' && cat.id!=='ALL') ? `<button class="btn-icon-only edit-inline" title="删除" style="color:var(--color-bad)" onclick="deleteCategory('${cat.id}')">🗑</button>` : ''}
        </div>
      `;
      container.appendChild(div);
    });
  };

  window.addNewCategory = async function() {
    const name = document.getElementById('newCategoryName')?.value.trim();
    if (!name) { alert('请输入分类名称'); return; }
    const r = await window.api('/api/categories','POST',{ name });
    if (!r.ok){ alert((r.body&&r.body.error)||'创建失败'); return; }
    document.getElementById('newCategoryName').value = '';
    await window.loadData();
    window.renderCategoryList();
    window.renderTabs();
  };

  window.deleteCategory = async function(id) {
    const cat = window.categories.find(c=>c.id===id);
    if (!cat) return;
    if (!confirm(`确定删除分类 "${cat.name}" 吗？相关项目将移至 "其他" 分类。`)) return;
    const r = await window.api(`/api/categories?id=${encodeURIComponent(cat.id)}`,'DELETE');
    if (!r.ok){ alert((r.body&&r.body.error)||'删除失败'); return; }
    // Optimistic update
    window.reports.forEach(x=>{ if (x.category===cat.id) x.category='qita'; });
    await window.loadData();
    window.currentCatFilter = 'ALL';
    window.renderCategoryList();
    window.renderTabs();
    window.renderList();
  };

  window.editCategory = function(id) {
    const cat = window.categories.find(c=>c.id===id);
    if(!cat) return;
    const newName = prompt('请输入新的分类名称:', cat.name);
    if (newName && newName.trim()) {
      // We need an API for this or just delete/create? 
      // Assuming simple update isn't in API, or maybe POST with same ID? 
      // Wait, API supports update? Previous code used local storage for edit.
      // Since there's no API endpoint for updating category name shown in previous code, 
      // we might just skip implementing it or assume we can't.
      // However, user might expect it. 
      // Let's try to just update locally? No, that won't persist.
      // I'll alert not supported or try to create new and move?
      // For now, let's just skip logic or do nothing.
      alert('暂不支持重命名分类');
    }
  };

  // ============================================
  // 8. Prompt Logic
  // ============================================
  window.updatePrompt = function() {
    const name = document.getElementById('pName')?.value.trim();
    const ticker = document.getElementById('pTicker')?.value.trim();
    const web = document.getElementById('pWeb')?.value.trim();
    const tw = document.getElementById('pTw')?.value.trim();
    const note = document.getElementById('pNote')?.value.trim();
    const msgEl = document.getElementById('pMsg');
    
    if (!name || !ticker) {
      if(msgEl) { msgEl.textContent = '项目名称和Ticker为必填项！'; msgEl.style.color = 'var(--color-bad)'; }
      return;
    }
    if(msgEl) msgEl.textContent = '';

    let prompt = `请分析以下项目，并以JSON格式输出投研报告：\n项目名称: ${name}\nTicker/代币符号: ${ticker}`;
    if (web) prompt += `\n官网: ${web}`;
    if (tw) prompt += `\nX: ${tw}`;
    if (note) prompt += `\n补充资料/备注: ${note}`;
    
    prompt += `\n\n[以下是JSON报告格式要求，请严格遵循]\n{
  "project_name": "${name}",
  "ticker": "${ticker}",
  "focus_points": [ "从代币投资视角出发，当下最需要重点关注的要点，1 条一项，建议 3-7 条" ], 
  "ai_score": { 
    "overall": 0.0, 
    "base_info_reliability": 0.0, 
    "narrative_fit": 0.0, 
    "product_and_tech": 0.0, 
    "team_strength": 0.0, 
    "market_potential": 0.0, 
    "score_explanation": "评分核心逻辑" 
  },
  "launchpad": "launchpad 平台或 '信息不足'", 
  "tagline": "一句话概括核心定位", 
  "basic_info": { "summary": "1-2 段概述", "core_features": [ "核心特点" ] }, 
  "detailed_analysis": "请在此处输出完整的研报内容，必须包含以下章节，并严格使用###作为章节标题（例如：### 团队背景）：\\n\\n### 团队背景\\n[内容]\\n\\n### 代币经济\\n[内容]\\n\\n### 商业潜力\\n[内容]\\n\\n### 竞品分析\\n[内容]\\n\\n### 进度与路线图\\n[内容]",
  "meta": { "generated_at": "${new Date().toISOString()}", "notes": "用户备注: ${note}" }
}`;
    document.getElementById('pOutput').value = prompt;
  };

  // ============================================
  // 9. Init & Events
  // ============================================
  window.init = async function() {
    await window.loadData();
    if (window.reports.length > 0) {
      window.currentReportId = window.reports.find(r => !r.is_deleted)?.id || null;
    }
    window.renderTabs();
    window.renderList();
    window.renderDetail();

    // Event Bindings
    const bind = (id, evt, fn) => { const el = document.getElementById(id); if(el) el.addEventListener(evt, fn); };
    const click = (id, fn) => bind(id, 'click', fn);
    
    click('navBtnPrompt', () => window.openModal('modalPrompt'));
    click('navBtnImport', () => window.openModal('modalImport'));
    click('btnImportParse', window.parseImport);
    click('btnConfirmImport', window.confirmImport);
    click('btnGenPrompt', () => {
      window.updatePrompt();
      const out = document.getElementById('pOutput');
      out.select();
      document.execCommand('copy');
      const msg = document.getElementById('pMsg');
      if(msg) { msg.textContent = 'Prompt已复制！'; msg.style.color = 'var(--color-good)'; }
    });
    
    bind('pName', 'input', window.updatePrompt);
    bind('pTicker', 'input', window.updatePrompt);
    bind('catSelect', 'change', (e) => {
      const grp = document.getElementById('newCatGroup');
      if(grp) grp.style.display = e.target.value === '__NEW__' ? 'block' : 'none';
    });
    bind('searchInput', 'input', (e) => {
      // Debounce manually or just simple
      setTimeout(window.renderList, 300);
    });
    bind('sortSelect', 'change', (e) => {
      window.currentSort = e.target.value;
      window.renderList();
    });

    const fArea = document.getElementById('fileUploadArea');
    if (fArea) {
      fArea.addEventListener('dragover', (e) => { e.preventDefault(); fArea.classList.add('dragover'); });
      fArea.addEventListener('dragleave', (e) => { e.preventDefault(); fArea.classList.remove('dragover'); });
      fArea.addEventListener('drop', (e) => { e.preventDefault(); fArea.classList.remove('dragover'); window.handleDrop(e); });
    }
  };

  document.addEventListener('DOMContentLoaded', window.init);

})();
