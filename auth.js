async function api(path, method='GET', data){
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (data) opts.body = JSON.stringify(data);
  const resp = await fetch(path, opts);
  const ct = resp.headers.get('Content-Type')||'';
  const isJson = ct.includes('application/json');
  const body = isJson ? await resp.json() : await resp.text();
  return { ok: resp.ok, body };
}

async function refreshSession(){
  const r = await api('/api/session');
  const adminLink = document.getElementById('adminLink');
  if (r.ok && r.body && r.body.loggedIn){
    const st = r.body.user && r.body.user.status;
    if (st === 'admin'){ adminLink.style.display = ''; }
    else adminLink.style.display = 'none';
  }else{
    adminLink.style.display = 'none';
  }
}

async function login(){
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const msg = document.getElementById('loginMsg');
  msg.textContent = '';
  const r = await api('/api/login','POST',{ username:u, password:p });
  if (!r.ok){ msg.textContent = (r.body && r.body.error) || '登录失败'; return; }
  msg.textContent = '登录成功';
  await refreshSession();
}

async function logout(){
  const msg = document.getElementById('loginMsg');
  await api('/api/logout','POST');
  msg.textContent = '已退出登录';
  await refreshSession();
}

async function register(){
  const u = document.getElementById('regUser').value.trim();
  const p = document.getElementById('regPass').value;
  const msg = document.getElementById('regMsg');
  msg.textContent = '';
  const r = await api('/api/register','POST',{ username:u, password:p });
  if (!r.ok){ msg.textContent = (r.body && r.body.error) || '提交失败'; return; }
  msg.textContent = '已提交，等待审核';
}

function bind(){
  const b1 = document.getElementById('btnLogin'); if (b1) b1.addEventListener('click', login);
  const b2 = document.getElementById('btnLogout'); if (b2) b2.addEventListener('click', logout);
  const b3 = document.getElementById('btnRegister'); if (b3) b3.addEventListener('click', register);
}

document.addEventListener('DOMContentLoaded', function(){ bind(); refreshSession(); });

