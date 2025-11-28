exports.config = { runtime: 'nodejs' };
const { requireRole } = require('../lib/guard');
const { getCfg, headersJson } = require('../lib/supabase');

module.exports = async function(req, res){
  const sess = requireRole(req, res, ['admin']); if (!sess) return;
  const { url } = getCfg();
  const h = headersJson();
  if (req.method === 'GET'){
    const q = req.query || {}; if (q.action === 'pending-list'){ const r = await fetch(`${url}/rest/v1/users?status=eq.pending&select=id,username,created_at,status&order=created_at.asc`, { headers: { apikey:(process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY), Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY}` } }); if(!r.ok){ res.status(400).json({ error:'list failed' }); return; } const rows = await r.json(); res.setHeader('Cache-Control','no-store'); res.status(200).json({ items: rows||[] }); return; }
    res.status(400).json({ error:'unknown action' }); return;
  }
  if (req.method === 'POST'){
    const body = req.body || {}; const id = body.id; const action = body.action;
    if (!id || !action){ res.status(400).json({ error:'missing id or action' }); return; }
    let patch = null; let method = 'PATCH';
    if (action==='approve') patch = { status:'member' };
    else if (action==='blacklist') patch = { status:'blacklisted' };
    else if (action==='recover') patch = { status:'member' };
    else if (action==='reject'){ method = 'DELETE'; }
    else { res.status(400).json({ error:'unknown action' }); return; }
    const r = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(id)}`, { method, headers:h, body: method==='PATCH'?JSON.stringify(patch):undefined });
    if (!r.ok){ res.status(400).json({ error:'update failed' }); return; }
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({ ok:true });
    return;
  }
  res.status(405).send('Method Not Allowed');
}

