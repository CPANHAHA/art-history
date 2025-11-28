exports.config = { runtime: 'nodejs' };
const { getCfg, headersJson } = require('../_lib/supabase');

module.exports = async function(req, res){
  const { url } = getCfg();
  if (req.method === 'GET'){
    const h = { apikey:(process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY), Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY}` };
    const r = await fetch(`${url}/rest/v1/categories?select=id,name&order=name.asc`, { headers: h });
    if (!r.ok){ res.status(400).json({ error:'list failed' }); return; }
    const rows = await r.json();
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({ items: rows || [] });
    return;
  }
  if (req.method === 'POST'){
    const body = req.body || {}; const name = String(body.name||'').trim();
    if (!name){ res.status(400).json({ error:'name required' }); return; }
    const cid = name.toLowerCase().replace(/\s+/g,'_');
    const h = headersJson();
    const exists = await fetch(`${url}/rest/v1/categories?id=eq.${encodeURIComponent(cid)}&select=id`, { headers: h });
    if (exists.ok){ const rows = await exists.json(); if (Array.isArray(rows) && rows[0]){ res.status(409).json({ error:'category exists' }); return; } }
    const ins = await fetch(`${url}/rest/v1/categories`, { method:'POST', headers: h, body: JSON.stringify({ id: cid, name }) });
    if (!ins.ok){ res.status(400).json({ error:'create failed' }); return; }
    const out = await ins.json();
    res.setHeader('Cache-Control','no-store');
    res.status(201).json(out[0]);
    return;
  }
  res.status(405).send('Method Not Allowed');
}

