exports.config = { runtime: 'nodejs' };
const { requireRole } = require('../_lib/guard');
const { getCfg, headersJson } = require('../_lib/supabase');

module.exports = async function(req, res){
  const sess = requireRole(req, res, ['admin']); if (!sess) return;
  if (req.method !== 'POST'){ res.status(405).send('Method Not Allowed'); return; }
  const body = req.body || {};
  const { id } = body;
  if (!id){ res.status(400).json({ error: 'missing id' }); return; }
  const { url } = getCfg();
  const h = headersJson();
  const resp = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', headers: h, body: JSON.stringify({ status: 'member' }) });
  if (!resp.ok){ res.status(400).json({ error: 'update failed' }); return; }
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ ok: true });
}

