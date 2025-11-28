exports.config = { runtime: 'nodejs' };
const { getCfg, headersJson } = require('../_lib/supabase');

module.exports = async function(req, res){
  if (req.method !== 'DELETE'){ res.status(405).send('Method Not Allowed'); return; }
  const cid = req.query && req.query.id;
  if (!cid){ res.status(400).json({ error:'missing id' }); return; }
  if (cid === 'qita'){ res.status(400).json({ error:"'其他'不可删除" }); return; }
  const { url } = getCfg();
  const h = headersJson();
  const reassign = await fetch(`${url}/rest/v1/reports?category=eq.${encodeURIComponent(cid)}`, { method:'PATCH', headers: h, body: JSON.stringify({ category: 'qita' }) });
  if (!reassign.ok){ res.status(400).json({ error:'reassign failed' }); return; }
  const del = await fetch(`${url}/rest/v1/categories?id=eq.${encodeURIComponent(cid)}`, { method:'DELETE', headers: h });
  if (!del.ok){ res.status(400).json({ error:'delete failed' }); return; }
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ ok:true });
}

