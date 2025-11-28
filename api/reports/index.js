exports.config = { runtime: 'nodejs' };
const { getCfg, headersJson } = require('../_lib/supabase');

function now(){ return new Date().toISOString(); }
function id(){ return String(Date.now()); }
function pick(obj, keys){ const out={}; for(const k of keys){ if (obj[k]!==undefined) out[k]=obj[k]; } return out; }

module.exports = async function(req, res){
  const { url } = getCfg();
  if (req.method === 'GET'){
    const q = req.query || {}; const category = q.category; const search = q.search; const sort = q.sort || 'recent'; const page = parseInt(q.page||'1',10)||1; const page_size = parseInt(q.page_size||'20',10)||20;
    const h = { apikey:(process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY), Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY}` };
    const params = [ 'deleted_at=is.null' ];
    if (category && category !== 'ALL') params.push(`category=eq.${encodeURIComponent(category)}`);
    if (search){ params.push(`project_name=ilike.%25${encodeURIComponent(search)}%25`); }
    const order = sort==='rating' ? 'order=ai_rating.desc.nulls_last' : 'order=updated_at.desc';
    const limit = `limit=${page_size}`; const offset = `offset=${(page-1)*page_size}`;
    const urlQ = `${url}/rest/v1/reports?select=*&${params.join('&')}&${order}&${limit}&${offset}`;
    const r = await fetch(urlQ, { headers: h });
    if (!r.ok){ res.status(400).json({ error:'list failed' }); return; }
    const items = await r.json();
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({ items });
    return;
  }
  if (req.method === 'POST'){
    const body = req.body || {}; const name = String(body.project_name||'').trim(); if (!name){ res.status(400).json({ error:'project_name required' }); return; }
    const keys=[ 'ai_rating','twitter_handle','ticker','launchpad','labels','basic_info','team_background','dev_activity_rating','dev_activity_note','token_mechanism','progress_plan','business_potential','competitors','focus_points','sources','generated_at' ];
    const record = { id:id(), project_name:name, category:(body.category||'qita'), created_at:now(), updated_at:now(), deleted_at:null, ...pick(body, keys) };
    const h = headersJson();
    const r = await fetch(`${url}/rest/v1/reports`, { method:'POST', headers:h, body: JSON.stringify(record) });
    if (!r.ok){ res.status(400).json({ error:'create failed' }); return; }
    const rows = await r.json();
    res.setHeader('Cache-Control','no-store');
    res.status(201).json(rows[0]);
    return;
  }
  res.status(405).send('Method Not Allowed');
}

