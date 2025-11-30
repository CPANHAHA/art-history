async function api(path, method='GET', data){
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (data) opts.body = JSON.stringify(data);
  const resp = await fetch(path, opts);
  const ct = resp.headers.get('Content-Type')||'';
  const isJson = ct.includes('application/json');
  const body = isJson ? await resp.json() : await resp.text();
  return { ok: resp.ok, body };
}

async function toggleBlock(username, currentStatus) {
  const action = currentStatus === 'blacklisted' ? 'restore' : 'block';
  if (!confirm(`确定要${action === 'block' ? '拉黑' : '恢复'}用户 ${username} 吗？`)) return;
  
  const r = await api(`/api/admin/users/${username}/${action}`, 'POST');
  if (r.ok) {
    loadUsers();
  } else {
    alert('操作失败: ' + (r.body.error || 'Unknown error'));
  }
}

async function loadUsers(){
  const tbody = document.getElementById('usersTbody');
  const msg = document.getElementById('usersMsg');
  if (!tbody) return;
  tbody.innerHTML=''; msg.textContent='加载中...';
  
  // Add timestamp to prevent caching
  const r = await api('/api/admin/users?t=' + Date.now());
  if (!r.ok){ 
    console.error('Load users failed:', r);
    msg.innerHTML = '加载失败: ' + r.body + '<br><small style="opacity:0.7">请检查网络或稍后重试</small>'; 
    return; 
  }
  msg.textContent = '';
  
  const items = (r.body && r.body.items) || [];
  items.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  
  items.forEach(u => {
    const tr = document.createElement('tr');
    
    // Username
    const td1 = document.createElement('td'); 
    td1.textContent = u.username; 
    tr.appendChild(td1);
    
    // Status
    const td2 = document.createElement('td'); 
    const badge = document.createElement('span');
    badge.className = 'status-badge' + (u.status==='blacklisted' ? ' status-blacklisted' : (u.status==='admin' ? ' status-admin' : ' status-member'));
    badge.textContent = u.status === 'blacklisted' ? '已拉黑' : u.status;
    td2.appendChild(badge);
    tr.appendChild(td2);
    
    // Created At
    const td3 = document.createElement('td'); 
    td3.textContent = new Date(u.created_at).toLocaleString(); 
    tr.appendChild(td3);
    
    // Actions
    const td4 = document.createElement('td');
    if (u.status !== 'admin') {
      const btn = document.createElement('button');
      if (u.status === 'blacklisted') {
        btn.textContent = '恢复';
        btn.className = 'status-badge status-pending'; // Use existing green/blue style or custom
        btn.style.cursor = 'pointer';
        btn.style.border = '1px solid currentColor';
        btn.onclick = () => toggleBlock(u.username, u.status);
      } else {
        btn.textContent = '拉黑';
        btn.className = 'status-badge status-blacklisted';
        btn.style.cursor = 'pointer';
        btn.style.border = '1px solid currentColor';
        btn.onclick = () => toggleBlock(u.username, u.status);
      }
      td4.appendChild(btn);
    } else {
      td4.textContent = '-';
    }
    tr.appendChild(td4);
    
    tbody.appendChild(tr);
  });
}

function bind(){
  const lo = document.getElementById('logoutBtn'); 
  if (lo) lo.addEventListener('click', async function(){ 
    await api('/api/logout','POST'); 
    location.href='/'; 
  });
  loadUsers();
}

document.addEventListener('DOMContentLoaded', function(){ 
  // Check auth first
  (async function(){
    try{
      const r = await fetch('/api/session');
      const d = await r.json();
      const ok = d && d.loggedIn && d.user && d.user.status==='admin';
      if (!ok){ alert('仅管理员可访问后台'); location.href='/'; return; }
      bind();
    }catch(e){ location.href='/'; }
  })();
});
