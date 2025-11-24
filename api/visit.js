exports.config = { runtime: 'nodejs' };

function getCfg(){
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anon: process.env.SUPABASE_ANON_KEY,
  };
}

async function supabaseIncrease(){
  const { url, key } = getCfg();
  if (!url || !key) return 0;
  const table = 'visit_counter';
  const id = 1;
  try {
    const headers = {
      apikey: (process.env.SUPABASE_ANON_KEY || key),
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    const curResp = await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=total`, { headers });
    if (!curResp.ok) return 0;
    const rows = await curResp.json();
    const current = Array.isArray(rows) && rows[0] && typeof rows[0].total === 'number' ? rows[0].total : 0;
    const next = current + 1;
    const upsertResp = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ id, total: next }]),
    });
    if (!upsertResp.ok) return current; // 保底返回当前值
    return next;
  } catch {
    return 0;
  }
}

async function supabaseGet(){
  const { url, key } = getCfg();
  if (!url || !key) return 0;
  const table = 'visit_counter';
  const id = 1;
  try {
    const headers = {
      apikey: (process.env.SUPABASE_ANON_KEY || key),
      Authorization: `Bearer ${key}`,
    };
    const curResp = await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=total`, { headers });
    if (!curResp.ok) return 0;
    const rows = await curResp.json();
    const current = Array.isArray(rows) && rows[0] && typeof rows[0].total === 'number' ? rows[0].total : 0;
    return current;
  } catch {
    return 0;
  }
}

module.exports = async function(req, res){
  const q = req.query || {};
  const peek = ('peek' in q);
  const debug = ('debug' in q);
  const { url, key } = getCfg();
  if (debug){
    const out = { hasUrl: !!url, hasKey: !!key, getStatus: null, upsertStatus: null };
    try{
      const table = 'visit_counter';
      const id = 1;
      const headers = { apikey: key, Authorization: `Bearer ${key}` };
      const curResp = await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=total`, { headers });
      out.getStatus = curResp.status;
      // try a no-op upsert to see status
      const testHeaders = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
      const upsertResp = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, { method:'POST', headers: testHeaders, body: JSON.stringify([{ id, total: 0 }]) });
      out.upsertStatus = upsertResp.status;
    }catch(e){
      out.error = true;
    }
    res.setHeader('Cache-Control','no-store');
    res.status(200).json(out);
    return;
  }
  let count = 0;
  if (!peek) count = await supabaseIncrease();
  else count = await supabaseGet();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ count });
}
