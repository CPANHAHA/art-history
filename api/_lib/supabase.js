exports.config = { runtime: 'nodejs' };

function getCfg(){
  return {
    url: process.env.SUPABASE_URL,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anon: process.env.SUPABASE_ANON_KEY,
  };
}

function headersJson(){
  const { service, anon } = getCfg();
  const key = service || anon;
  return {
    apikey: (process.env.SUPABASE_ANON_KEY || key),
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function getUserByUsername(username){
  const { url } = getCfg();
  const h = headersJson();
  const resp = await fetch(`${url}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash,password_salt,status`, { headers: h });
  if (!resp.ok) return null;
  const rows = await resp.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function insertPendingUser(username, password_hash, password_salt){
  const { url } = getCfg();
  const h = headersJson();
  const body = JSON.stringify({ username, password_hash, password_salt, status: 'pending' });
  const resp = await fetch(`${url}/rest/v1/users`, { method:'POST', headers: h, body });
  if (!resp.ok) return null;
  const rows = await resp.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

module.exports = { getCfg, headersJson, getUserByUsername, insertPendingUser };

