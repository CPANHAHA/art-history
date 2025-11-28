exports.config = { runtime: 'nodejs' };
const { getCfg, headersJson } = require('../../_lib/supabase');

module.exports = async function(req, res){
  if (req.method !== 'POST'){ res.status(405).send('Method Not Allowed'); return; }
  const rid = req.query && req.query.id;
  if (!rid){ res.status(400).json({ error:'missing id' }); return; }
  const { url } = getCfg();
  const h = headersJson();
  const le = await fetch(`${url}/rest/v1/last_edits?report_id=eq.${encodeURIComponent(rid)}&select=snapshot`, { headers: h });
  if (!le.ok){ res.status(404).json({ error:'no snapshot' }); return; }
  const rows = await le.json(); const snap = Array.isArray(rows)&&rows[0]?rows[0].snapshot:null;
  if (!snap){ res.status(404).json({ error:'no snapshot' }); return; }
  const up = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(rid)}`, { method:'PATCH', headers:h, body: JSON.stringify({ ...snap, updated_at: snap.updated_at }) });
  if (!up.ok){ res.status(400).json({ error:'restore failed' }); return; }
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ ok:true });
}

