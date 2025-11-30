async function api(path, method='GET', data){
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (data) opts.body = JSON.stringify(data);
  const resp = await fetch(path, opts);
  const ct = resp.headers.get('Content-Type')||'';
  const isJson = ct.includes('application/json');
  const body = isJson ? await resp.json() : await resp.text();
  return { ok: resp.ok, body };
}

async function loadPending(){
  const tbody = document.getElementById('pendingTbody');
  const msg = document.getElementById('pendingMsg');
  tbody.innerHTML = '';
  msg.textContent = '';
  const r = await api('/api/admin?action=pending-list');
  if (!r.ok){ msg.textContent = '加载失败'; return; }
  const items = (r.body && r.body.items) || [];
  items.forEach(u => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = u.username; tr.appendChild(td1);
    const td2 = document.createElement('td'); td2.textContent = new Date(u.created_at).toLocaleString(); tr.appendChild(td2);
    const td3 = document.createElement('td'); td3.className='actions';
    const b1 = document.createElement('button'); b1.className='btn'; b1.textContent='通过'; b1.onclick=()=>act('approve',u.id);
    const b2 = document.createElement('button'); b2.className='btn'; b2.textContent='加入黑名单'; b2.onclick=()=>act('blacklist',u.id);
    const b3 = document.createElement('button'); b3.className='btn'; b3.textContent='拒绝/删除'; b3.onclick=()=>act('reject',u.id);
    td3.appendChild(b1); td3.appendChild(b2); td3.appendChild(b3);
    tr.appendChild(td3);
    tbody.appendChild(tr);
  });
}

async function act(action, id){
  const r = await api('/api/admin','POST',{ action, id });
  await loadPending();
}

async function recover(){
  const id = document.getElementById('recoverId').value.trim();
  const msg = document.getElementById('recoverMsg');
  msg.textContent = '';
  if (!id){ msg.textContent = '请输入用户ID'; return; }
  const r = await api('/api/admin','POST',{ action:'recover', id });
  msg.textContent = r.ok ? '已恢复为 member' : '恢复失败';
}

function bind(){
  const br = document.getElementById('btnRecover'); if (br) br.addEventListener('click', recover);
  const lo = document.getElementById('logoutBtn'); if (lo) lo.addEventListener('click', async function(){ await api('/api/logout','POST'); location.href='/'; });
  loadUsers();
}

document.addEventListener('DOMContentLoaded', function(){ bind(); loadPending(); });

async function loadUsers(){
  const tbody = document.getElementById('usersTbody');
  const msg = document.getElementById('usersMsg');
  if (!tbody) return;
  tbody.innerHTML=''; msg.textContent='';
  const r = await api('/api/admin?action=users');
  if (!r.ok){ msg.textContent='加载失败'; return; }
  const items = (r.body && r.body.items) || [];
  items.forEach(u => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = u.username; tr.appendChild(td1);
    const td2 = document.createElement('td'); 
    const badge = document.createElement('span');
    badge.className = 'status-badge' + (u.status==='pending' ? ' status-pending' : (u.status==='blacklisted' ? ' status-blacklisted' : ''));
    badge.textContent = u.status;
    td2.appendChild(badge);
    tr.appendChild(td2);
    const td3 = document.createElement('td'); td3.textContent = new Date(u.created_at).toLocaleString(); tr.appendChild(td3);
    tbody.appendChild(tr);
  });
}
