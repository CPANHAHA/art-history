exports.config = { runtime: 'nodejs' };
const { getCfg, headersJson } = require('../lib/supabase');

module.exports = async function(req, res){
  const { url } = getCfg();
  if (req.method === 'GET'){
    const headers = { apikey:(process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY), Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY}` };
    const r = await fetch(`${url}/rest/v1/categories?select=id,name&order=name.asc`, { headers });
    if (!r.ok){ res.status(400).json({ error:'list failed' }); return; }
    const rows = await r.json(); res.setHeader('Cache-Control','no-store'); res.status(200).json({ items: rows||[] }); return;
  }
  if (req.method === 'POST'){
    const body = req.body || {}; const name = String(body.name||'').trim(); if (!name){ res.status(400).json({ error:'name required' }); return; }
    const cid = name.toLowerCase().replace(/\s+/g,'_'); const h = headersJson();
    const ins = await fetch(`${url}/rest/v1/categories`, { method:'POST', headers:h, body: JSON.stringify({ id: cid, name }) });
    if (!ins.ok){ res.status(400).json({ error:'create failed' }); return; }
    const out = await ins.json(); res.setHeader('Cache-Control','no-store'); res.status(201).json(out[0]); return;
  }
  if (req.method === 'DELETE'){
    const q = req.query || {}; const cid = q.id; if (!cid){ res.status(400).json({ error:'missing id' }); return; }
    if (cid==='qita'){ res.status(400).json({ error:'\'其他\'不可删除' }); return; }
    const h = headersJson();
    const reassign = await fetch(`${url}/rest/v1/reports?category=eq.${encodeURIComponent(cid)}`, { method:'PATCH', headers:h, body: JSON.stringify({ category:'qita' }) }); if (!reassign.ok){ res.status(400).json({ error:'reassign failed' }); return; }
    const del = await fetch(`${url}/rest/v1/categories?id=eq.${encodeURIComponent(cid)}`, { method:'DELETE', headers:h }); if (!del.ok){ res.status(400).json({ error:'delete failed' }); return; }
    res.setHeader('Cache-Control','no-store'); res.status(200).json({ ok:true }); return;
  }
  res.status(405).send('Method Not Allowed');
}

