exports.config = { runtime: 'nodejs' };
const { getCfg, headersJson } = require('../_lib/supabase');

function now(){ return new Date().toISOString(); }

module.exports = async function(req, res){
  const rid = req.query && req.query.id;
  if (!rid){ res.status(400).json({ error:'missing id' }); return; }
  const { url } = getCfg();
  const h = headersJson();
  if (req.method === 'PUT'){
    const curResp = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(rid)}&select=*`, { headers: h });
    if (!curResp.ok){ res.status(404).json({ error:'not found' }); return; }
    const curRows = await curResp.json(); const current = Array.isArray(curRows)&&curRows[0]?curRows[0]:null;
    if (!current){ res.status(404).json({ error:'not found' }); return; }
    const snap = JSON.parse(JSON.stringify(current));
    const existLe = await fetch(`${url}/rest/v1/last_edits?report_id=eq.${encodeURIComponent(rid)}&select=report_id`, { headers: h });
    let okLe=false; if (existLe.ok){ const rows = await existLe.json(); if (Array.isArray(rows)&&rows[0]){ const pe = await fetch(`${url}/rest/v1/last_edits?report_id=eq.${encodeURIComponent(rid)}`, { method:'PATCH', headers:h, body: JSON.stringify({ snapshot:snap, edited_at: now() }) }); okLe = pe.ok; } }
    if (!okLe){ const ie = await fetch(`${url}/rest/v1/last_edits`, { method:'POST', headers:h, body: JSON.stringify({ report_id: rid, snapshot: snap, edited_at: now() }) }); if (!ie.ok){ res.status(400).json({ error:'snapshot failed' }); return; } }
    const obj = req.body || {}; obj.updated_at = now(); delete obj.id; delete obj.created_at;
    const up = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(rid)}`, { method:'PATCH', headers:h, body: JSON.stringify(obj) });
    if (!up.ok){ res.status(400).json({ error:'update failed' }); return; }
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({ ok:true });
    return;
  }
  if (req.method === 'DELETE'){
    const up = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(rid)}`, { method:'PATCH', headers:h, body: JSON.stringify({ deleted_at: now(), updated_at: now() }) });
    if (!up.ok){ res.status(400).json({ error:'delete failed' }); return; }
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({ ok:true });
    return;
  }
  res.status(405).send('Method Not Allowed');
}

