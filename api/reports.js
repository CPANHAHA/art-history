exports.config = { runtime: 'nodejs' };
const { getCfg, headersJson } = require('../lib/supabase');

function now(){ return new Date().toISOString(); }
function id(){ return String(Date.now()); }
function pick(obj, keys){ const out={}; for(const k of keys){ if (obj[k]!==undefined) out[k]=obj[k]; } return out; }

module.exports = async function(req, res){
  const { url } = getCfg();
  if (req.method === 'GET'){
    const q = req.query || {}; const category = q.category; const search = q.search; const sort = q.sort || 'recent'; const page = parseInt(q.page||'1',10)||1; const page_size = parseInt(q.page_size||'20',10)||20;
    const headers = { apikey:(process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY), Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY}` };
    const params = [ 'deleted_at=is.null' ]; if (category && category!=='ALL') params.push(`category=eq.${encodeURIComponent(category)}`); if (search) params.push(`project_name=ilike.%25${encodeURIComponent(search)}%25`);
    const order = sort==='rating' ? 'order=ai_rating.desc.nulls_last' : 'order=updated_at.desc'; const limit = `limit=${page_size}`; const offset = `offset=${(page-1)*page_size}`;
    const r = await fetch(`${url}/rest/v1/reports?select=*&${params.join('&')}&${order}&${limit}&${offset}`, { headers }); if (!r.ok){ res.status(400).json({ error:'list failed' }); return; }
    const items = await r.json(); res.setHeader('Cache-Control','no-store'); res.status(200).json({ items }); return;
  }
  if (req.method === 'POST'){
    const q = req.query || {}; if (q.restore==='1' || q.restore===1){ const rid = q.id; if (!rid){ res.status(400).json({ error:'missing id' }); return; } const h = headersJson(); const le = await fetch(`${url}/rest/v1/last_edits?report_id=eq.${encodeURIComponent(rid)}&select=snapshot`, { headers:h }); if (!le.ok){ res.status(404).json({ error:'no snapshot' }); return; } const rows = await le.json(); const snap = Array.isArray(rows)&&rows[0]?rows[0].snapshot:null; if (!snap){ res.status(404).json({ error:'no snapshot' }); return; } const up = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(rid)}`, { method:'PATCH', headers:h, body: JSON.stringify({ ...snap, updated_at: snap.updated_at }) }); if (!up.ok){ res.status(400).json({ error:'restore failed' }); return; } res.setHeader('Cache-Control','no-store'); res.status(200).json({ ok:true }); return; }
    const body = req.body || {}; const name = String(body.project_name||'').trim(); if (!name){ res.status(400).json({ error:'project_name required' }); return; }
    const keys=[ 'ai_rating','twitter_handle','ticker','launchpad','labels','basic_info','team_background','dev_activity_rating','dev_activity_note','token_mechanism','progress_plan','business_potential','competitors','focus_points','sources','generated_at' ];
    const record = { id:id(), project_name:name, category:(body.category||'qita'), created_at:now(), updated_at:now(), deleted_at:null, ...pick(body, keys) };
    const h = headersJson(); const r = await fetch(`${url}/rest/v1/reports`, { method:'POST', headers:h, body: JSON.stringify(record) }); if (!r.ok){ res.status(400).json({ error:'create failed' }); return; } const rows = await r.json(); res.setHeader('Cache-Control','no-store'); res.status(201).json(rows[0]); return;
  }
  if (req.method === 'PUT'){
    const q = req.query || {}; const rid = q.id; if (!rid){ res.status(400).json({ error:'missing id' }); return; }
    const h = headersJson(); const curResp = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(rid)}&select=*`, { headers:h }); if (!curResp.ok){ res.status(404).json({ error:'not found' }); return; } const curRows = await curResp.json(); const current = Array.isArray(curRows)&&curRows[0]?curRows[0]:null; if (!current){ res.status(404).json({ error:'not found' }); return; }
    const snap = JSON.parse(JSON.stringify(current)); const existLe = await fetch(`${url}/rest/v1/last_edits?report_id=eq.${encodeURIComponent(rid)}&select=report_id`, { headers:h }); let okLe=false; if (existLe.ok){ const rows = await existLe.json(); if (Array.isArray(rows)&&rows[0]){ const pe = await fetch(`${url}/rest/v1/last_edits?report_id=eq.${encodeURIComponent(rid)}`, { method:'PATCH', headers:h, body: JSON.stringify({ snapshot:snap, edited_at: now() }) }); okLe = pe.ok; } } if (!okLe){ const ie = await fetch(`${url}/rest/v1/last_edits`, { method:'POST', headers:h, body: JSON.stringify({ report_id: rid, snapshot: snap, edited_at: now() }) }); if (!ie.ok){ res.status(400).json({ error:'snapshot failed' }); return; } }
    const obj = req.body || {}; obj.updated_at = now(); delete obj.id; delete obj.created_at; const up = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(rid)}`, { method:'PATCH', headers:h, body: JSON.stringify(obj) }); if (!up.ok){ res.status(400).json({ error:'update failed' }); return; } res.setHeader('Cache-Control','no-store'); res.status(200).json({ ok:true }); return;
  }
  if (req.method === 'DELETE'){
    const q = req.query || {}; const rid = q.id; if (!rid){ res.status(400).json({ error:'missing id' }); return; }
    const h = headersJson(); const up = await fetch(`${url}/rest/v1/reports?id=eq.${encodeURIComponent(rid)}`, { method:'PATCH', headers:h, body: JSON.stringify({ deleted_at: now(), updated_at: now() }) }); if (!up.ok){ res.status(400).json({ error:'delete failed' }); return; } res.setHeader('Cache-Control','no-store'); res.status(200).json({ ok:true }); return;
  }
  res.status(405).send('Method Not Allowed');
}

