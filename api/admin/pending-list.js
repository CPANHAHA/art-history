exports.config = { runtime: 'nodejs' };
const { requireRole } = require('../_lib/guard');
const { getCfg } = require('../_lib/supabase');

module.exports = async function(req, res){
  const sess = requireRole(req, res, ['admin']); if (!sess) return;
  const { url } = getCfg();
  const headers = {
    apikey: (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY}`,
  };
  const resp = await fetch(`${url}/rest/v1/users?status=eq.pending&select=id,username,created_at,status&order=created_at.asc`, { headers });
  if (!resp.ok){ res.status(400).json({ error: 'list failed' }); return; }
  const rows = await resp.json();
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ items: rows || [] });
}

