let _supabase = null;
async function getSupabase() {
  if (_supabase) return _supabase;
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error('Config failed');
    const { url, anon } = await r.json();
    if (!url || !anon) throw new Error('Missing Supabase config');
    _supabase = window.supabase.createClient(url, anon);
    return _supabase;
  } catch (e) {
    console.error('Init Supabase failed:', e);
    alert('无法连接数据库，请检查配置');
    return null;
  }
}

async function loadUsers() {
  const msg = document.getElementById('usersMsg');
  if(msg) msg.textContent = '加载中...';
  
  const supabase = await getSupabase();
  if (!supabase) return;

  const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

  if (error) {
    console.error('Load users failed:', error);
    if(msg) msg.innerHTML = `<span style="color:red">加载失败: ${error.message}</span>`;
    return;
  }
  
  if(msg) msg.textContent = '';
  renderUserTables(users || []);
}

function renderUserTables(users) {
  const pending = users.filter(u => u.status === 'pending');
  const members = users.filter(u => u.status === 'member');
  const blocked = users.filter(u => u.status === 'blacklisted');
  const admins = users.filter(u => u.status === 'admin');

  // Render Pending
  const pendingEl = document.getElementById('pending-list');
  if (pendingEl) {
    pendingEl.innerHTML = pending.length ? pending.map(u => `
      <tr>
        <td>${u.username || u.email || 'No Name'}</td>
        <td>${new Date(u.created_at).toLocaleString()}</td>
        <td>
          <button class="status-badge status-member" style="cursor:pointer; border:none;" onclick="approveUser('${u.id}')">通过</button>
          <button class="status-badge status-blacklisted" style="cursor:pointer; border:none;" onclick="rejectUser('${u.id}')">拒绝</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--muted)">无待审核用户</td></tr>';
  }

  // Render Members (Active + Blocked + Admin)
  const memberEl = document.getElementById('member-list');
  if (memberEl) {
    const activeUsers = [...members, ...blocked, ...admins];
    // Sort by created_at desc
    activeUsers.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    memberEl.innerHTML = activeUsers.length ? activeUsers.map(u => {
      let actionBtn = '-';
      if (u.status !== 'admin') {
        if (u.status === 'blacklisted') {
          actionBtn = `<button class="status-badge status-pending" style="cursor:pointer; border:none;" onclick="toggleBlock('${u.id}', 'blacklisted')">恢复</button>`;
        } else {
          actionBtn = `<button class="status-badge status-blacklisted" style="cursor:pointer; border:none;" onclick="toggleBlock('${u.id}', 'member')">拉黑</button>`;
        }
      }
      
      return `
        <tr>
          <td>${u.username || u.email || 'No Name'}</td>
          <td><span class="status-badge status-${u.status}">${u.status === 'blacklisted' ? '已拉黑' : u.status}</span></td>
          <td>${new Date(u.created_at).toLocaleString()}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted)">暂无用户</td></tr>';
  }
}

window.approveUser = async (id) => {
  const supabase = await getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('users').update({ status: 'member' }).eq('id', id);
  if (!error) { loadUsers(); }
  else alert('操作失败:' + error.message);
};

window.rejectUser = async (id) => {
  if(!confirm('确定拒绝并删除该申请吗？')) return;
  const supabase = await getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (!error) { loadUsers(); }
  else alert('操作失败:' + error.message);
};

window.toggleBlock = async (id, currentStatus) => {
  const action = currentStatus === 'blacklisted' ? 'restore' : 'block';
  if (!confirm(`确定要${action === 'block' ? '拉黑' : '恢复'}该用户吗？`)) return;
  
  const newStatus = action === 'block' ? 'blacklisted' : 'member';
  const supabase = await getSupabase();
  if (!supabase) return;
  
  const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', id);
  if (!error) { loadUsers(); }
  else alert('操作失败:' + error.message);
};

// Helper for logout
async function api(path, method='GET'){
  await fetch(path, { method, headers: { 'Content-Type':'application/json' } });
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
